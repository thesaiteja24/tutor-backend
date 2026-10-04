import { conversationService, type ConversationService } from "@/modules/conversations/index.ts";
import { userService, type UserService } from "@/modules/users/index.ts";
import {
  createLLMProvider,
  createSTTProvider,
  createTTSProvider,
  type LLMProvider,
  type STTProvider,
  type TTSProvider,
} from "@/shared/ai/index.ts";
import { BadRequestError, NotFoundError } from "@/shared/errors/index.ts";
import { buildTutorSystemPrompt, toPublicTutorTurn, toTtsSpeechText, sanitizeEmojis } from "@/shared/ai/tutor.helpers.ts";
import { inspectPcmWav, VOICE_INPUT_AUDIO } from "@/shared/audio/audio-contract.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";
import { env } from "@/config/index.ts";

type VoiceTutorDependencies = {
  conversations: Pick<
    ConversationService,
    "getConversationById" | "beginUserTurn" | "getRecentMessages" | "completeUserTurn" | "failUserTurn"
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
    }
  ) {
    this.stt = stt;
    this.llm = llm;
    this.tts = tts;
  }

  async processPushToTalk(
    conversationId: string,
    audioBuffer: Buffer,
    mimeType: string,
    options?: { overrideVoiceId?: string }
  ) {
    const totalStart = performance.now();

    // 1. Fetch conversation & persona
    const conversation = await this.dependencies.conversations.getConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const persona = conversation.persona;
    if (!persona) {
      throw new NotFoundError(`Persona for conversation '${conversationId}' not found`);
    }

    // 2. Fetch User Profile & Recent History concurrently
    const [user, pastMessages] = await Promise.all([
      this.dependencies.users.getUserById(conversation.userId),
      this.dependencies.conversations.getRecentMessages(conversationId, 10),
    ]);
    const nativeLanguage = user?.nativeLanguage || "te";
    const englishLevel = user?.englishLevel || "intermediate";

    // 3. Reject an incomplete mobile recording before invoking STT.
    if (audioBuffer.length < env.MIN_AUDIO_INPUT_BYTES) {
      devLogger.warn("Audio:Preflight", "Rejected too-small recording before STT", {
        mimeType,
        inputBytes: audioBuffer.length,
        minimumBytes: env.MIN_AUDIO_INPUT_BYTES,
      });
      throw new BadRequestError("That recording was too short to process. Please hold the button and speak for a moment.", [
        { code: "recording_too_short", message: `Recording must be at least ${env.MIN_AUDIO_INPUT_BYTES} bytes` },
      ]);
    }

    const audioInspection = inspectPcmWav(audioBuffer);
    devLogger.info("Audio:Contract", "Inspected uploaded PCM WAV", {
      mimeType,
      inputBytes: audioBuffer.length,
      ...audioInspection,
    });
    if (mimeType !== VOICE_INPUT_AUDIO.mimeType || !audioInspection.valid) {
      throw new BadRequestError("That recording is not a valid 16 kHz mono PCM WAV. Please record it again.", [
        { code: "invalid_audio_format", message: audioInspection.reason || "Audio does not match the voice input contract" },
      ]);
    }

    // 4. STT: Saaras receives the mobile-produced PCM WAV directly.
    const sttStart = performance.now();
    const sttResult = await this.stt.transcribe(audioBuffer, mimeType, {
      language: nativeLanguage,
    });
    const sttMs = Math.round(performance.now() - sttStart);

    const rawTranscript = sttResult.text;
    if (!rawTranscript || rawTranscript.trim().length === 0) {
      devLogger.warn("STT:Sarvam", "Saaras returned an empty transcript", {
        inputBytes: audioBuffer.length,
        audioRms: audioInspection.rms,
        audioPeak: audioInspection.peak,
        nonZeroRatio: audioInspection.nonZeroRatio,
        durationSeconds: sttResult.durationSeconds,
        languageCode: sttResult.languageCode,
      });
      throw new BadRequestError("No speech could be recognized from the audio.");
    }

    const userTranscript = rawTranscript.trim().normalize("NFC");

    // 5. Save the pending user turn
    const pendingTurn = await this.dependencies.conversations.beginUserTurn({
      conversationId,
      transcript: userTranscript,
      transcriptMetadata: {
        source: "audio",
        requestedLanguage: nativeLanguage,
        detectedLanguage: sttResult.languageCode,
        confidence: sttResult.confidence ?? null,
        confidenceSource: sttResult.confidence === undefined ? "unavailable" : "provider",
        durationSeconds: sttResult.durationSeconds,
      },
      latencyMetrics: { sttMs },
    });

    // 6. Build History Context
    const history = pastMessages.map((m) => ({
      role: m.sender as "user" | "assistant",
      content: m.content,
    }));

    // 7. Build System Prompt (Persona -> Practice Mode -> Context -> Contract)
    const systemPrompt = buildTutorSystemPrompt({
      personaPrompt: persona.systemPrompt,
      practiceModePrompt: conversation.practiceMode?.systemPrompt,
      customPrompt: conversation.customPrompt,
      nativeLanguage,
      englishLevel,
    });

    let stage: "llm" | "tts" = "llm";
    try {
      // 8. LLM: Generate Response
      const llmStart = performance.now();
      const llmResult = await this.llm.generateTutorReply({
        systemPrompt,
        history,
        userMessage: userTranscript,
        nativeLanguage,
        englishLevel,
        practiceModePrompt: conversation.practiceMode?.systemPrompt,
        customPrompt: conversation.customPrompt,
      });
      const llmMs = Math.round(performance.now() - llmStart);

      // 9. Synthesize speech
      stage = "tts";
      const voiceToUse = options?.overrideVoiceId || persona.voiceId;
      const speechText = toTtsSpeechText(llmResult);
      if (speechText.length > env.MAX_TTS_INPUT_CHARS) {
        throw new Error(`Validated speech text exceeds ${env.MAX_TTS_INPUT_CHARS} characters`);
      }
      const ttsStart = performance.now();
      const ttsResult = await this.tts.synthesize(speechText, voiceToUse, nativeLanguage);
      const ttsMs = Math.round(performance.now() - ttsStart);
      if (ttsResult.audioBuffer.length > env.MAX_TTS_AUDIO_BYTES) {
        throw new Error(`TTS audio exceeds ${env.MAX_TTS_AUDIO_BYTES} byte response limit`);
      }

      devLogger.info("TTS:Turn", "Synthesized validated tutor speech", {
        inputCharacters: speechText.length,
        audioBytes: ttsResult.audioBuffer.length,
        ttsMs,
      });

      const totalMs = Math.round(performance.now() - totalStart);

      // 10. Persist the assistant reply and atomically complete the learner turn.
      const assistantMessage = await this.dependencies.conversations.completeUserTurn({
        conversationId,
        turnId: pendingTurn.turnId,
        userMessageId: pendingTurn.message.id,
        assistantMessage: {
          content: llmResult.content,
          responseData: llmResult as Record<string, unknown>,
          latencyMetrics: {
            sttMs,
            llmMs,
            ttsMs,
            totalMs,
            ttsInputCharacters: speechText.length,
            ttsAudioBytes: ttsResult.audioBuffer.length,
          },
        },
      });

      return {
        userTranscript,
        audioBase64: ttsResult.audioBuffer.toString("base64"),
        audioFormat: ttsResult.format,
        latencyMetrics: {
          sttMs,
          llmMs,
          ttsMs,
          totalMs,
        },
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
    options?: { overrideVoiceId?: string }
  ) {
    const totalStart = performance.now();

    const conversation = await this.dependencies.conversations.getConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
    }

    const persona = conversation.persona;
    if (!persona) {
      throw new NotFoundError(`Persona for conversation '${conversationId}' not found`);
    }

    // Fetch User Profile & Recent History concurrently
    const [user, pastMessages] = await Promise.all([
      this.dependencies.users.getUserById(conversation.userId),
      this.dependencies.conversations.getRecentMessages(conversationId, 10),
    ]);
    const nativeLanguage = user?.nativeLanguage || "te";
    const englishLevel = user?.englishLevel || "intermediate";

    // Persist text input as a pending learner turn
    const pendingTurn = await this.dependencies.conversations.beginUserTurn({
      conversationId,
      transcript: text.trim().normalize("NFC"),
      transcriptMetadata: { source: "text", requestedLanguage: nativeLanguage },
    });

    // Build History Context
    const history = pastMessages.map((m) => ({
      role: m.sender as "user" | "assistant",
      content: m.content,
    }));

    const systemPrompt = buildTutorSystemPrompt({
      personaPrompt: persona.systemPrompt,
      practiceModePrompt: conversation.practiceMode?.systemPrompt,
      customPrompt: conversation.customPrompt,
      nativeLanguage,
      englishLevel,
    });

    let stage: "llm" | "tts" = "llm";
    try {
      const llmStart = performance.now();
      const llmResult = await this.llm.generateTutorReply({
        systemPrompt,
        history,
        userMessage: text,
        nativeLanguage,
        englishLevel,
        practiceModePrompt: conversation.practiceMode?.systemPrompt,
        customPrompt: conversation.customPrompt,
      });
      const llmMs = Math.round(performance.now() - llmStart);

      stage = "tts";
      const voiceToUse = options?.overrideVoiceId || persona.voiceId;
      const speechText = toTtsSpeechText(llmResult);
      if (speechText.length > env.MAX_TTS_INPUT_CHARS) {
        throw new Error(`Validated speech text exceeds ${env.MAX_TTS_INPUT_CHARS} characters`);
      }
      const ttsStart = performance.now();
      const ttsResult = await this.tts.synthesize(speechText, voiceToUse, nativeLanguage);
      const ttsMs = Math.round(performance.now() - ttsStart);
      if (ttsResult.audioBuffer.length > env.MAX_TTS_AUDIO_BYTES) {
        throw new Error(`TTS audio exceeds ${env.MAX_TTS_AUDIO_BYTES} byte response limit`);
      }

      devLogger.info("TTS:Turn", "Synthesized validated tutor speech", {
        inputCharacters: speechText.length,
        audioBytes: ttsResult.audioBuffer.length,
        ttsMs,
      });

      const totalMs = Math.round(performance.now() - totalStart);

      const assistantMessage = await this.dependencies.conversations.completeUserTurn({
        conversationId,
        turnId: pendingTurn.turnId,
        userMessageId: pendingTurn.message.id,
        assistantMessage: {
          content: llmResult.content,
          responseData: llmResult as Record<string, unknown>,
          latencyMetrics: {
            sttMs: 0,
            llmMs,
            ttsMs,
            totalMs,
            ttsInputCharacters: speechText.length,
            ttsAudioBytes: ttsResult.audioBuffer.length,
          },
        },
      });

      return {
        userTranscript: text,
        audioBase64: ttsResult.audioBuffer.toString("base64"),
        audioFormat: ttsResult.format,
        latencyMetrics: {
          sttMs: 0,
          llmMs,
          ttsMs,
          totalMs,
        },
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

  async processStreamingInteraction(params: {
    conversationId: string;
    input: { type: "audio"; buffer: Buffer; mimeType?: string } | { type: "text"; text: string };
    overrideVoiceId?: string;
    onTranscript?: (transcript: string) => void;
    onTextDelta?: (delta: string) => Promise<void> | void;
    onAudioChunk?: (chunk: { index: number; audioBase64: string; format: string; text: string }) => Promise<void> | void;
    isCancelled?: () => boolean;
  }) {
    const totalStart = performance.now();

    const conversation = await this.dependencies.conversations.getConversationById(params.conversationId);
    if (!conversation) {
      throw new NotFoundError(`Conversation with ID '${params.conversationId}' not found`);
    }

    const persona = conversation.persona;
    if (!persona) {
      throw new NotFoundError(`Persona for conversation '${params.conversationId}' not found`);
    }

    // Fetch User Profile & Recent History concurrently
    const [user, pastMessages] = await Promise.all([
      this.dependencies.users.getUserById(conversation.userId),
      this.dependencies.conversations.getRecentMessages(params.conversationId, 10),
    ]);
    const nativeLanguage = user?.nativeLanguage || "te";
    const englishLevel = user?.englishLevel || "intermediate";
    const voiceToUse = params.overrideVoiceId || persona.voiceId;

    let userTranscript = "";
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
      const sttResult = await this.stt.transcribe(audioBuffer, mimeType, { language: nativeLanguage });
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

    // Save pending learner turn
    const pendingTurn = await this.dependencies.conversations.beginUserTurn({
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

    const systemPrompt = buildTutorSystemPrompt({
      personaPrompt: persona.systemPrompt,
      practiceModePrompt: conversation.practiceMode?.systemPrompt,
      customPrompt: conversation.customPrompt,
      nativeLanguage,
      englishLevel,
    });

    let nextSentenceIndex = 0;
    let nextEmitIndex = 0;
    const pendingChunks = new Map<number, { index: number; audioBase64: string; format: string; text: string }>();
    const synthesisPromises: Promise<void>[] = [];
    let firstChunkTtsMs = 0;
    let ttfaMs = 0;
    const llmStart = performance.now();

    try {
      const llmResult = await this.llm.generateTutorReply({
        systemPrompt,
        history,
        userMessage: userTranscript,
        nativeLanguage,
        englishLevel,
        practiceModePrompt: conversation.practiceMode?.systemPrompt,
        customPrompt: conversation.customPrompt,
        onTextDelta: async (delta) => {
          if (params.isCancelled?.()) return;
          await params.onTextDelta?.(delta);
        },
        onSentenceChunk: async (sentence) => {
          if (params.isCancelled?.()) return;
          // 1. Assign strict sequential index immediately upon sentence extraction
          const myIndex = nextSentenceIndex++;
          const cleanSentence = sanitizeEmojis(sentence).replace(/[*_#`~]/g, "").trim();
          if (!cleanSentence) return;

          const promise = (async () => {
            const t0 = performance.now();
            const ttsRes = await this.tts.synthesize(cleanSentence, voiceToUse, nativeLanguage);
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

            // 2. Emit chunks strictly in ascending order 0 -> 1 -> 2 ...
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

      // Ensure all concurrent synthesis promises have completed and flushed
      await Promise.all(synthesisPromises);
      while (pendingChunks.has(nextEmitIndex)) {
        const readyChunk = pendingChunks.get(nextEmitIndex)!;
        pendingChunks.delete(nextEmitIndex);
        nextEmitIndex++;
        await params.onAudioChunk?.(readyChunk);
      }

      const llmMs = Math.round(performance.now() - llmStart);
      const totalMs = Math.round(performance.now() - totalStart);

      const assistantMessage = await this.dependencies.conversations.completeUserTurn({
        conversationId: params.conversationId,
        turnId: pendingTurn.turnId,
        userMessageId: pendingTurn.message.id,
        assistantMessage: {
          content: llmResult.content,
          responseData: llmResult as Record<string, unknown>,
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
      await this.dependencies.conversations.failUserTurn(pendingTurn.message.id, {
        stage: "llm",
        code: "tutor_streaming_failed",
        retryable: true,
        occurredAt: new Date().toISOString(),
      });
      throw error;
    }
  }
}

export const voiceTutorService = new VoiceTutorService();
