import { env } from "@/config/index.ts";
import { type ConversationService,conversationService } from "@/modules/conversations/index.ts";
import { type UserService,userService } from "@/modules/users/index.ts";
import {
  createLLMProvider,
  createSTTProvider,
  createTTSProvider,
  type LLMProvider,
  type STTProvider,
  type TTSProvider,
} from "@/shared/ai/index.ts";
import { toPublicTutorTurn, toTtsSpeechText } from "@/shared/ai/tutor.helpers.ts";
import { inspectPcmWav, VOICE_INPUT_AUDIO } from "@/shared/audio/audio-contract.ts";
import { BadRequestError, NotFoundError } from "@/shared/errors/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";

import { processStreamingTurn, type StreamingInteractionParams } from "./voice-tutor.streaming.ts";

type VoiceTutorDependencies = {
  conversations: Pick<
    ConversationService,
    "getConversationById" | "getConversationForUser" | "beginUserTurn" | "getRecentMessages" | "completeUserTurn" | "failUserTurn"
  >;
  users: Pick<UserService, "getUserById">;
};

export class VoiceTutorService {
  private stt: STTProvider;
  private llm: LLMProvider;
  private tts: TTSProvider;

  constructor(
    stt: STTProvider = createSTTProvider(),
    llm: LLMProvider = createLLMProvider(),
    tts: TTSProvider = createTTSProvider(),
    private readonly dependencies: VoiceTutorDependencies = {
      conversations: conversationService,
      users: userService,
    },
  ) {
    this.stt = stt;
    this.llm = llm;
    this.tts = tts;
  }

  async processPushToTalk(
    conversationId: string,
    audioBuffer: Buffer,
    mimeType: string,
    options?: { overrideVoiceId?: string; userId?: string },
  ) {
    const totalStart = performance.now();

    // 1. Fetch conversation & persona
    const conversation = options?.userId
      ? await this.dependencies.conversations.getConversationForUser(options.userId, conversationId)
      : await this.dependencies.conversations.getConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const persona = conversation.persona;
    if (!persona) {
      throw new NotFoundError(`Persona for conversation '${conversationId}' not found`);
    }

    // 2. Fetch user profile & recent messages
    const [user, pastMessages] = await Promise.all([
      this.dependencies.users.getUserById(conversation.userId),
      this.dependencies.conversations.getRecentMessages(conversationId, 10),
    ]);
    const nativeLanguage = user?.nativeLanguage || "te";
    const englishLevel = user?.englishLevel || "intermediate";
    const voiceToUse = options?.overrideVoiceId || persona.voiceId;

    // 3. Audio validation
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

    // 4. STT Transcription
    let stage: "stt" | "llm" | "tts" = "stt";
    const sttStart = performance.now();
    const sttResult = await this.stt.transcribe(audioBuffer, mimeType, { language: nativeLanguage });
    const sttMs = Math.round(performance.now() - sttStart);

    const userTranscript = (sttResult.text || "").trim().normalize("NFC");
    if (!userTranscript) {
      throw new BadRequestError("No speech could be recognized from the audio.");
    }

    // 5. Begin user turn
    const pendingTurn = await this.dependencies.conversations.beginUserTurn({
      conversationId,
      transcript: userTranscript,
      transcriptMetadata: {
        source: "audio",
        requestedLanguage: nativeLanguage,
        detectedLanguage: sttResult.languageCode,
        confidence: sttResult.confidence,
      },
      latencyMetrics: { sttMs },
    });

    try {
      // 6. LLM Generation
      stage = "llm";
      const history = pastMessages.map((m) => ({
        role: m.sender as "user" | "assistant",
        content: m.content,
      }));

      const learnerContextPrompt = `The learner has English level '${englishLevel}' and native language '${nativeLanguage}'. Keep corrections supportive.`;

      const llmStart = performance.now();
      const llmResult = await this.llm.generateTutorReply({
        personaPrompt: persona.systemPrompt,
        practiceModePrompt: conversation.practiceMode?.systemPrompt || "",
        learnerContextPrompt,
        history,
        userMessage: userTranscript,
      });
      const llmMs = Math.round(performance.now() - llmStart);

      // 7. TTS Synthesis
      stage = "tts";
      const ttsText = toTtsSpeechText(llmResult);
      const ttsStart = performance.now();
      const ttsResult = await this.tts.synthesize(ttsText, voiceToUse, nativeLanguage);
      const ttsMs = Math.round(performance.now() - ttsStart);
      const totalMs = Math.round(performance.now() - totalStart);

      // 8. Complete turn
      const assistantMessage = await this.dependencies.conversations.completeUserTurn({
        conversationId,
        turnId: pendingTurn.turnId,
        userMessageId: pendingTurn.message.id,
        assistantMessage: {
          content: llmResult.content,
          audioUrl: null,
          responseData: llmResult as unknown as Record<string, unknown>,
          latencyMetrics: { sttMs, llmMs, ttsMs, totalMs },
        },
      });

      devLogger.info("VoiceTutor:Turn", `Completed turn for conversation ${conversationId}`, {
        userTranscript,
        assistantContent: llmResult.content,
        latency: { sttMs, llmMs, ttsMs, totalMs },
      });

      return {
        userTranscript,
        audioBase64: ttsResult.audioBuffer.toString("base64"),
        audioFormat: ttsResult.format,
        latencyMetrics: { sttMs, llmMs, ttsMs, totalMs },
        userMessageId: pendingTurn.message.id,
        assistantMessageId: assistantMessage.id,
        turn: toPublicTutorTurn(llmResult),
      };
    } catch (error) {
      await this.dependencies.conversations.failUserTurn(pendingTurn.message.id, {
        stage,
        code: `tutor_${stage}_failed`,
        retryable: true,
        occurredAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  async processTextInteraction(
    conversationId: string,
    text: string,
    options?: { overrideVoiceId?: string; userId?: string },
  ) {
    const totalStart = performance.now();

    const conversation = options?.userId
      ? await this.dependencies.conversations.getConversationForUser(options.userId, conversationId)
      : await this.dependencies.conversations.getConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const persona = conversation.persona;
    if (!persona) {
      throw new NotFoundError(`Persona for conversation '${conversationId}' not found`);
    }

    const [user, pastMessages] = await Promise.all([
      this.dependencies.users.getUserById(conversation.userId),
      this.dependencies.conversations.getRecentMessages(conversationId, 10),
    ]);
    const nativeLanguage = user?.nativeLanguage || "te";
    const englishLevel = user?.englishLevel || "intermediate";
    const voiceToUse = options?.overrideVoiceId || persona.voiceId;

    const userTranscript = text.trim().normalize("NFC");
    if (!userTranscript) {
      throw new BadRequestError("Text input cannot be empty.");
    }

    const pendingTurn = await this.dependencies.conversations.beginUserTurn({
      conversationId,
      transcript: userTranscript,
      transcriptMetadata: {
        source: "text",
        requestedLanguage: nativeLanguage,
      },
      latencyMetrics: { sttMs: 0 },
    });

    let stage: "llm" | "tts" = "llm";
    try {
      stage = "llm";
      const history = pastMessages.map((m) => ({
        role: m.sender as "user" | "assistant",
        content: m.content,
      }));

      const learnerContextPrompt = `The learner has English level '${englishLevel}' and native language '${nativeLanguage}'. Keep corrections supportive.`;

      const llmStart = performance.now();
      const llmResult = await this.llm.generateTutorReply({
        personaPrompt: persona.systemPrompt,
        practiceModePrompt: conversation.practiceMode?.systemPrompt || "",
        learnerContextPrompt,
        history,
        userMessage: userTranscript,
      });
      const llmMs = Math.round(performance.now() - llmStart);

      stage = "tts";
      const ttsText = toTtsSpeechText(llmResult);
      const ttsStart = performance.now();
      const ttsResult = await this.tts.synthesize(ttsText, voiceToUse, nativeLanguage);
      const ttsMs = Math.round(performance.now() - ttsStart);
      const totalMs = Math.round(performance.now() - totalStart);

      const assistantMessage = await this.dependencies.conversations.completeUserTurn({
        conversationId,
        turnId: pendingTurn.turnId,
        userMessageId: pendingTurn.message.id,
        assistantMessage: {
          content: llmResult.content,
          audioUrl: null,
          responseData: llmResult as unknown as Record<string, unknown>,
          latencyMetrics: { sttMs: 0, llmMs, ttsMs, totalMs },
        },
      });

      return {
        userTranscript,
        audioBase64: ttsResult.audioBuffer.toString("base64"),
        audioFormat: ttsResult.format,
        latencyMetrics: { sttMs: 0, llmMs, ttsMs, totalMs },
        userMessageId: pendingTurn.message.id,
        assistantMessageId: assistantMessage.id,
        turn: toPublicTutorTurn(llmResult),
      };
    } catch (error) {
      await this.dependencies.conversations.failUserTurn(pendingTurn.message.id, {
        stage,
        code: `tutor_${stage}_failed`,
        retryable: true,
        occurredAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  async processStreamingInteraction(params: StreamingInteractionParams) {
    return processStreamingTurn(params, {
      stt: this.stt,
      llm: this.llm,
      tts: this.tts,
      conversations: this.dependencies.conversations,
      users: this.dependencies.users,
    });
  }
}

export const voiceTutorService = new VoiceTutorService();
