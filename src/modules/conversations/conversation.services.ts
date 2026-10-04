import fs from "node:fs";
import path from "node:path";
import { personaService } from "@/modules/personas/index.ts";
import { practiceModeService } from "@/modules/practice-modes/index.ts";
import { userService } from "@/modules/users/index.ts";
import { NotFoundError } from "@/shared/errors/index.ts";
import type { TranscriptMetadata, TurnFailureData } from "@/database/schema/messages.ts";
import { conversationRepository, type ConversationRepository } from "./conversation.repositories.ts";
import type {
  CreateConversationInput,
  ListConversationsQuery,
  UpdateConversationInput,
} from "./conversation.schemas.ts";
import {
  parseTutorTurnResponse,
  toPublicTutorTurn,
  toTtsSpeechText,
} from "@/shared/ai/tutor.helpers.ts";
import { createLLMProvider, type LLMProvider } from "@/shared/ai/llm.adapter.ts";
import { createTTSProvider, type TTSProvider } from "@/shared/ai/tts.adapter.ts";

export class ConversationService {
  constructor(
    private readonly repo: ConversationRepository = conversationRepository,
    private readonly llm: LLMProvider = createLLMProvider(),
    private readonly tts: TTSProvider = createTTSProvider()
  ) {}

  async listConversations(query: ListConversationsQuery) {
    return this.repo.findMany(query);
  }

  async getConversationById(id: string) {
    const conversation = await this.repo.findById(id);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${id}' not found`);
    }
    return conversation;
  }

  async getConversationWithHistory(id: string, limit: number = 50) {
    const conversation = await this.repo.findWithMessages(id, limit);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${id}' not found`);
    }
    return {
      ...conversation,
      messages: conversation.messages.map((message: any) => {
        if (message.sender !== "assistant" || !message.responseData) return message;
        try {
          return { ...message, turn: toPublicTutorTurn(parseTutorTurnResponse(message.responseData)) };
        } catch {
          return message;
        }
      }),
    };
  }

  async createConversation(input: CreateConversationInput) {
    // Validate persona exists
    const persona = await personaService.getPersonaById(input.personaId);

    // Validate or default practice mode
    let practiceMode;
    if (input.practiceModeId) {
      practiceMode = await practiceModeService.getPracticeModeById(input.practiceModeId);
    } else {
      const modesList = await practiceModeService.listPracticeModes({ limit: 1, offset: 0 });
      if (modesList.items.length === 0) {
        throw new NotFoundError("No active practice modes available");
      }
      practiceMode = modesList.items[0]!;
    }

    // Get user (default user if not supplied)
    let userId = input.userId;
    let user;
    if (!userId) {
      user = await userService.getDefaultUser();
      userId = user.id;
    } else {
      user = await userService.getUserById(userId);
    }

    const nativeLanguage = user?.nativeLanguage || "te";
    const englishLevel = user?.englishLevel || "intermediate";
    const title = input.title || `Practice with ${persona.name}`;

    const conversation = await this.repo.create({
      userId,
      personaId: persona.id,
      practiceModeId: practiceMode.id,
      title,
      customPrompt: input.customPrompt || null,
      status: "active",
    });

    // Dynamically generate the opening greeting from the LLM in the persona's voice and practice mode
    const welcomeTurn = await this.llm.generateTutorReply({
      personaPrompt: persona.systemPrompt,
      practiceModePrompt: practiceMode.systemPrompt,
      customPrompt: input.customPrompt,
      nativeLanguage,
      englishLevel,
      history: [],
      userMessage: `[Session Start: Introduce yourself warmly as ${persona.name} in your unique persona voice and kick off our ${practiceMode.name} practice session with a friendly, brief conversational opening (strictly 2-3 sentences). Write native language words in their genuine native script (${nativeLanguage}, ~60%) and English words in standard English script (~40%). Never use words from other languages. Do not use any emojis.]`,
    });

    // Synthesize opening greeting audio for immediate mobile playback
    let audioUrl: string | null = null;
    try {
      const speechText = toTtsSpeechText(welcomeTurn);
      const ttsResult = await this.tts.synthesize(speechText, persona.voiceId, nativeLanguage);

      const greetingsDir = path.resolve(process.cwd(), "public", "audio", "greetings");
      if (!fs.existsSync(greetingsDir)) {
        fs.mkdirSync(greetingsDir, { recursive: true });
      }

      const fileName = `${conversation.id}_greeting.wav`;
      const filePath = path.join(greetingsDir, fileName);
      fs.writeFileSync(filePath, ttsResult.audioBuffer);
      audioUrl = `/static/audio/greetings/${fileName}`;
    } catch (ttsErr) {
      console.warn("Could not synthesize opening greeting audio:", ttsErr);
    }

    const assistantMessage = await this.repo.addMessage({
      conversationId: conversation.id,
      sender: "assistant",
      content: welcomeTurn.content,
      responseData: welcomeTurn,
      audioUrl,
    });

    return {
      ...conversation,
      persona,
      practiceMode,
      messages: [
        {
          ...assistantMessage,
          turn: toPublicTutorTurn(welcomeTurn),
          audioUrl,
        },
      ],
    };
  }

  async updateConversation(id: string, input: UpdateConversationInput) {
    await this.getConversationById(id);

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError(`Conversation with ID '${id}' not found`);
    }
    return updated;
  }

  async deleteConversation(id: string) {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new NotFoundError(`Conversation with ID '${id}' not found`);
    }
  }

  async addMessage(data: {
    conversationId: string;
    sender: "user" | "assistant";
    content: string;
    audioUrl?: string | null;
    latencyMetrics?: any;
  }) {
    return this.repo.addMessage({
      conversationId: data.conversationId,
      sender: data.sender,
      content: data.content,
      audioUrl: data.audioUrl || null,
      latencyMetrics: data.latencyMetrics || null,
    });
  }

  async beginUserTurn(data: {
    conversationId: string;
    transcript: string;
    transcriptMetadata: TranscriptMetadata;
    latencyMetrics?: Record<string, number>;
  }) {
    return this.repo.createPendingUserMessage({
      conversationId: data.conversationId,
      content: data.transcript,
      transcriptMetadata: data.transcriptMetadata,
      latencyMetrics: data.latencyMetrics,
    });
  }

  async completeUserTurn(data: {
    userMessageId: string;
    conversationId: string;
    turnId: string;
    assistantMessage: {
      content: string;
      audioUrl?: string | null;
      latencyMetrics?: Record<string, number>;
      responseData?: Record<string, unknown>;
    };
  }) {
    return this.repo.completeTurn(data);
  }

  async failUserTurn(userMessageId: string, failureData: TurnFailureData) {
    return this.repo.failPendingTurn(userMessageId, failureData);
  }

  async getRecentMessages(conversationId: string, limit: number = 10) {
    return this.repo.getRecentMessages(conversationId, limit);
  }
}

export const conversationService = new ConversationService();
