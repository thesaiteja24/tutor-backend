import { env } from "@/config/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";

import {
  type ChatMessage,
  type LLMProvider,
  TUTOR_TURN_JSON_SCHEMA,
  type TutorLLMParams,
} from "./llm.types.ts";
import { SentenceStreamExtractor } from "./sentence-stream.extractor.ts";
import {
  buildTutorSystemPrompt,
  createFallbackTutorTurn,
  parseTutorTurnResponse,
  stripJsonFence,
  type TutorTurnResponse,
  validationSummary,
} from "./tutor.helpers.ts";

export type { ChatMessage, LLMProvider, TutorLLMParams };

export class OpenAILLMProvider implements LLMProvider {
  private apiKey = env.OPENAI_API_KEY;
  private baseUrl = env.OPENAI_BASE_URL;
  private model = env.OPENAI_MODEL;
  private maxTokens = env.OPENAI_MAX_COMPLETION_TOKENS;

  async generateTutorReply(params: TutorLLMParams): Promise<TutorTurnResponse> {
    const systemPrompt = buildTutorSystemPrompt({
      personaPrompt: params.personaPrompt,
      practiceModePrompt: params.practiceModePrompt,
      customPrompt: params.customPrompt,
      nativeLanguage: params.nativeLanguage,
      englishLevel: params.englishLevel,
      learnerContextPrompt: params.learnerContextPrompt,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...params.history,
      { role: "user", content: params.userMessage },
    ];

    devLogger.info("LLM:OpenAI", `Sending prompt to ${this.endpoint} (model: ${this.model})`, {
      userMessage: params.userMessage,
      historyCount: params.history.length,
      streaming: Boolean(params.onSentenceChunk),
    });

    let rawContent: string;
    if (params.onSentenceChunk || params.onTextDelta) {
      try {
        rawContent = await this.streamCompletion(messages, params.onSentenceChunk, params.onTextDelta);
      } catch (streamErr) {
        devLogger.warn("LLM:OpenAI", "Streaming failed, falling back to batch request", { error: streamErr });
        rawContent = await this.requestCompletion(messages);
      }
    } else {
      rawContent = await this.requestCompletion(messages);
    }

    try {
      const turn = parseTutorTurnResponse(stripJsonFence(rawContent));
      devLogger.info("LLM:OpenAI", "Generated validated tutor turn", {
        topic: turn.learningState?.topic,
        hasOptions: Boolean(turn.options?.length),
        hasSpecial: Boolean(turn.special),
        hasCopiable: Boolean(turn.copiable),
      });
      return turn;
    } catch (error) {
      const feedback = validationSummary(error);
      devLogger.warn("LLM:OpenAI", "Repairing invalid structured tutor turn", { validationSummary: feedback });
      try {
        const repairedContent = await this.requestCompletion([
          ...messages,
          { role: "assistant", content: rawContent },
          {
            role: "user",
            content: `Reformat your previous response using this validation feedback: ${feedback}. Return only the complete JSON object matching the contract.`,
          },
        ]);
        const repaired = parseTutorTurnResponse(stripJsonFence(repairedContent));
        devLogger.info("LLM:OpenAI", "Repaired validated tutor turn", { topic: repaired.learningState?.topic });
        return repaired;
      } catch (repairError) {
        devLogger.error("LLM:OpenAI", "Using deterministic fallback after invalid structured response", repairError, {
          validationSummary: feedback,
        });
        return createFallbackTutorTurn();
      }
    }
  }

  private get endpoint() {
    return this.baseUrl.endsWith("/chat/completions") ? this.baseUrl : `${this.baseUrl}/chat/completions`;
  }

  private async streamCompletion(
    messages: ChatMessage[],
    onSentence?: (sentence: string) => Promise<void> | void,
    onTextDelta?: (delta: string) => Promise<void> | void,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the backend");
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = this.apiKey.replace(/^Bearer\s+/i, "").trim();
    headers.Authorization = `Bearer ${key}`;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        max_completion_tokens: this.maxTokens,
        stream: true,
        response_format: {
          type: "json_schema",
          json_schema: { name: "tutor_turn", strict: true, schema: TUTOR_TURN_JSON_SCHEMA },
        },
      }),
    });

    if (!response.ok || !response.body) {
      const body = await response.text();
      throw new Error(`LLM Generation stream failed (${response.status}): ${body}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let sseBuffer = "";
    const extractor = new SentenceStreamExtractor();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6)) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              extractor.feed(delta, onSentence, onTextDelta);
            }
          } catch {
            // Ignore parse errors on partial SSE lines
          }
        }
      }
    }

    if (onSentence) {
      extractor.flush(onSentence);
    }

    return accumulated;
  }

  private async requestCompletion(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the backend");
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = this.apiKey.replace(/^Bearer\s+/i, "").trim();
    headers.Authorization = `Bearer ${key}`;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        max_completion_tokens: this.maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: { name: "tutor_turn", strict: true, schema: TUTOR_TURN_JSON_SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      devLogger.error("LLM:OpenAI", `LLM generation failed (${response.status}): ${body}`, null, {
        endpoint: this.endpoint,
        status: response.status,
      });
      throw new Error(`LLM Generation failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }>;
    };
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    devLogger.info("LLM:OpenAI", "Received structured tutor completion", {
      finishReason: choice?.finish_reason,
      contentLength: content?.length || 0,
      hasRefusal: Boolean(choice?.message?.refusal),
    });

    if (!content?.trim()) {
      if (choice?.message?.refusal) {
        devLogger.warn("LLM:OpenAI", "Model generated a refusal, falling back to clean conversational turn", {
          refusal: choice.message.refusal,
        });
        return JSON.stringify({
          content: choice.message.refusal,
          special: null,
          copiable: null,
          options: null,
          correction: null,
          learningState: null,
        });
      }
      throw new Error("OpenAI returned an empty response");
    }

    return content;
  }
}

export class MockLLMProvider implements LLMProvider {
  async generateTutorReply(params: TutorLLMParams): Promise<TutorTurnResponse> {
    if (params.userMessage.includes("ఎలా ఉన్నావ్") || params.userMessage.includes("సాయితేజ")) {
      return {
        content: "చాలా చక్కగా చెప్పారు! మీ ఉచ్చారణ బాగుంది. Which sentence is grammatically correct?",
        special: null,
        copiable: null,
        options: [
          { id: 1, text: "She went to the market." },
          { id: 2, text: "She goed to the market." },
          { id: 3, text: "She gone to the market." },
        ],
        correction: null,
        learningState: { topic: "Grammar Basics", introducedTerms: [], targetSkill: "grammar" },
      };
    }
    return {
      content: "బాగుంది! ఈ వాక్యాన్ని ఒకసారి స్పష్టంగా చదవండి.",
      special: "Read aloud: He walks to the office every morning.",
      copiable: "He walks to the office every morning.",
      options: null,
      correction: null,
      learningState: { topic: "Daily Routine", introducedTerms: [], targetSkill: "pronunciation" },
    };
  }
}

export function createLLMProvider(): LLMProvider {
  return new OpenAILLMProvider();
}
