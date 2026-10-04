import { env } from "@/config/index.ts";
import type { ConversationService } from "@/modules/conversations/index.ts";
import type { UserService } from "@/modules/users/index.ts";
import type { LLMProvider, STTProvider, TTSProvider } from "@/shared/ai/index.ts";
import { sanitizeEmojis, toPublicTutorTurn } from "@/shared/ai/tutor.helpers.ts";
import { inspectPcmWav, VOICE_INPUT_AUDIO } from "@/shared/audio/audio-contract.ts";
import { BadRequestError, NotFoundError } from "@/shared/errors/index.ts";

export interface StreamingInteractionParams {
  conversationId: string;
  input: { type: "audio"; buffer: Buffer; mimeType?: string } | { type: "text"; text: string };
  overrideVoiceId?: string;
  onTranscript?: (transcript: string) => void;
  onTextDelta?: (delta: string) => Promise<void> | void;
  onAudioChunk?: (chunk: { index: number; audioBase64: string; format: string; text: string }) => Promise<void> | void;
  isCancelled?: () => boolean;
}

export interface StreamingDependencies {
  stt: STTProvider;
  llm: LLMProvider;
  tts: TTSProvider;
  conversations: Pick<
    ConversationService,
    "getConversationById" | "beginUserTurn" | "getRecentMessages" | "completeUserTurn" | "failUserTurn"
  >;
  users: Pick<UserService, "getUserById">;
}

export async function processStreamingTurn(
  params: StreamingInteractionParams,
  deps: StreamingDependencies,
) {
  const totalStart = performance.now();

  const conversation = await deps.conversations.getConversationById(params.conversationId);
  if (!conversation) {
    throw new NotFoundError(`Conversation with ID '${params.conversationId}' not found`);
  }

  const persona = conversation.persona;
  if (!persona) {
    throw new NotFoundError(`Persona for conversation '${params.conversationId}' not found`);
  }

  const [user, pastMessages] = await Promise.all([
    deps.users.getUserById(conversation.userId),
    deps.conversations.getRecentMessages(params.conversationId, 10),
  ]);
  const nativeLanguage = user?.nativeLanguage || "te";
  const englishLevel = user?.englishLevel || "intermediate";
  const voiceToUse = params.overrideVoiceId || persona.voiceId;

  let userTranscript: string;
  let sttMs = 0;

  if (params.input.type === "audio") {
    const audioBuffer = params.input.buffer;
    const mimeType = params.input.mimeType || VOICE_INPUT_AUDIO.mimeType;

    if (audioBuffer.length < env.MIN_AUDIO_INPUT_BYTES) {
      throw new BadRequestError("That recording was too short to process.", [
        { code: "recording_too_short", message: `Recording must be at least ${env.MIN_AUDIO_INPUT_BYTES} bytes` },
      ]);
    }

    const audioInspection = inspectPcmWav(audioBuffer);
    if (mimeType !== VOICE_INPUT_AUDIO.mimeType || !audioInspection.valid) {
      throw new BadRequestError("Invalid PCM WAV recording.", [
        { code: "invalid_audio_format", message: audioInspection.reason || "Invalid format" },
      ]);
    }

    const sttStart = performance.now();
    const sttResult = await deps.stt.transcribe(audioBuffer, mimeType, { language: nativeLanguage });
    sttMs = Math.round(performance.now() - sttStart);

    userTranscript = (sttResult.text || "").trim().normalize("NFC");
    if (!userTranscript) {
      throw new BadRequestError("No speech could be recognized from the audio.");
    }

    params.onTranscript?.(userTranscript);
  } else {
    userTranscript = params.input.text.trim().normalize("NFC");
    params.onTranscript?.(userTranscript);
  }

  if (params.isCancelled?.()) return null;

  const pendingTurn = await deps.conversations.beginUserTurn({
    conversationId: params.conversationId,
    transcript: userTranscript,
    transcriptMetadata: {
      source: params.input.type,
      requestedLanguage: nativeLanguage,
    },
    latencyMetrics: { sttMs },
  });

  const history = pastMessages.map((m) => ({
    role: m.sender as "user" | "assistant",
    content: m.content,
  }));

  const learnerContextPrompt = `The learner is speaking with level '${englishLevel}' and native language '${nativeLanguage}'. Keep corrections constructive.`;

  let nextSentenceIndex = 0;
  let nextEmitIndex = 0;
  const pendingChunks = new Map<number, { index: number; audioBase64: string; format: string; text: string }>();
  const synthesisPromises: Promise<void>[] = [];
  let firstChunkTtsMs = 0;
  let ttfaMs = 0;
  const llmStart = performance.now();

  try {
    const llmResult = await deps.llm.generateTutorReply({
      personaPrompt: persona.systemPrompt,
      practiceModePrompt: conversation.practiceMode?.systemPrompt || "",
      learnerContextPrompt,
      history,
      userMessage: userTranscript,
      onTextDelta: async (delta) => {
        if (params.isCancelled?.()) return;
        await params.onTextDelta?.(delta);
      },
      onSentenceChunk: async (sentence) => {
        if (params.isCancelled?.()) return;
        const myIndex = nextSentenceIndex++;
        const cleanSentence = sanitizeEmojis(sentence).replace(/[*_#`~]/g, "").trim();
        if (!cleanSentence) return;

        const promise = (async () => {
          const t0 = performance.now();
          const ttsRes = await deps.tts.synthesize(cleanSentence, voiceToUse, nativeLanguage);
          const ttsDuration = Math.round(performance.now() - t0);
          if (myIndex === 0) {
            firstChunkTtsMs = ttsDuration;
            ttfaMs = Math.round(performance.now() - totalStart);
          }

          if (params.isCancelled?.()) return;

          pendingChunks.set(myIndex, {
            index: myIndex,
            audioBase64: ttsRes.audioBuffer.toString("base64"),
            format: ttsRes.format,
            text: cleanSentence,
          });

          while (pendingChunks.has(nextEmitIndex)) {
            const readyChunk = pendingChunks.get(nextEmitIndex)!;
            pendingChunks.delete(nextEmitIndex);
            nextEmitIndex++;
            await params.onAudioChunk?.(readyChunk);
          }
        })();

        synthesisPromises.push(promise);
      },
    });

    await Promise.all(synthesisPromises);
    while (pendingChunks.has(nextEmitIndex)) {
      const readyChunk = pendingChunks.get(nextEmitIndex)!;
      pendingChunks.delete(nextEmitIndex);
      nextEmitIndex++;
      await params.onAudioChunk?.(readyChunk);
    }

    const llmMs = Math.round(performance.now() - llmStart);
    const totalMs = Math.round(performance.now() - totalStart);

    const assistantMessage = await deps.conversations.completeUserTurn({
      conversationId: params.conversationId,
      turnId: pendingTurn.turnId,
      userMessageId: pendingTurn.message.id,
      assistantMessage: {
        content: llmResult.content,
        responseData: llmResult as unknown as Record<string, unknown>,
        latencyMetrics: {
          sttMs,
          llmMs,
          ttsMs: firstChunkTtsMs,
          ttfaMs,
          totalMs,
          streamChunks: nextSentenceIndex,
        },
      },
    });

    return {
      userTranscript,
      turn: toPublicTutorTurn(llmResult),
      userMessageId: pendingTurn.message.id,
      assistantMessageId: assistantMessage.id,
      latencyMetrics: {
        sttMs,
        llmMs,
        ttsMs: firstChunkTtsMs,
        ttfaMs,
        totalMs,
        streamChunks: nextSentenceIndex,
      },
    };
  } catch (error) {
    await deps.conversations.failUserTurn(pendingTurn.message.id, {
      stage: "llm",
      code: "tutor_streaming_failed",
      retryable: true,
      occurredAt: new Date().toISOString(),
    });
    throw error;
  }
}
