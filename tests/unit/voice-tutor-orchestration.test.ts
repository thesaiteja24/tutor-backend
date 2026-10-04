import { describe, expect, it } from "bun:test";
import { VoiceTutorService } from "@/modules/voice-tutor/voice-tutor.services.ts";
import type { TutorTurnResponse } from "@/shared/ai/tutor.helpers.ts";

const sampleTurn: TutorTurnResponse = {
  content: "That sounds great! What happened next?",
  special: null,
  copiable: null,
  options: null,
  correction: null,
  learningState: { topic: "Daily Routine", introducedTerms: [], targetSkill: "fluency" },
};

function createDependencies() {
  const calls: { begin?: any; complete?: any; failed?: any } = {};
  return {
    calls,
    dependencies: {
      conversations: {
        getConversationById: async () => ({
          id: "conversation-id",
          userId: "user-id",
          practiceModeId: "01950000-0000-7000-9000-000000000001",
          practiceMode: { name: "AI Live Tutor", systemPrompt: "=== PRACTICE MODE: AI LIVE TUTOR ===\nProvide conversational tutoring." },
          customPrompt: null,
          persona: { name: "Emma", voiceId: "ritu", systemPrompt: "You are Emma, a calm tutor." },
        }),
        beginUserTurn: async (data: any) => {
          calls.begin = data;
          return { turnId: "turn-id", message: { id: "user-message-id" } };
        },
        getRecentMessages: async () => [],
        completeUserTurn: async (data: any) => {
          calls.complete = data;
          return { id: "assistant-message-id" };
        },
        failUserTurn: async (id: string, failure: any) => {
          calls.failed = { id, failure };
          return true;
        },
      },
      users: {
        getUserById: async () => ({ id: "user-id", nativeLanguage: "te", englishLevel: "intermediate" }),
      },
    },
  };
}

describe("voice tutor orchestration", () => {
  it("rejects a truncated recording before STT or turn creation", async () => {
    const { calls, dependencies } = createDependencies();
    let sttCalls = 0;
    const service = new VoiceTutorService(
      { transcribe: async () => { sttCalls += 1; return { text: "unused" }; } },
      { generateTutorReply: async () => sampleTurn },
      { synthesize: async () => ({ audioBuffer: Buffer.from("audio"), mimeType: "audio/mpeg" as const, format: "mp3" as const }) },
      dependencies as any
    );

    await expect(
      service.processPushToTalk("conversation-id", Buffer.alloc(100), "audio/wav")
    ).rejects.toThrow("too short to process");

    expect(sttCalls).toBe(0);
    expect(calls.begin).toBeUndefined();
  });

  it("processes a text interaction and completes the turn", async () => {
    const { calls, dependencies } = createDependencies();
    let ttsInput = "";
    const service = new VoiceTutorService(
      { transcribe: async () => ({ text: "unused" }) },
      { generateTutorReply: async () => sampleTurn },
      {
        synthesize: async (text: string) => {
          ttsInput = text;
          return { audioBuffer: Buffer.from("audio"), mimeType: "audio/mpeg", format: "mp3" as const };
        },
      },
      dependencies as any
    );

    const result = await service.processTextInteraction("conversation-id", "I had a good day");

    expect(ttsInput).toBe("That sounds great! What happened next?");
    expect(calls.begin.transcript).toBe("I had a good day");
    expect(calls.complete.turnId).toBe("turn-id");
    expect(calls.complete.assistantMessage.content).toBe(sampleTurn.content);
    expect(result.turn.content).toBe(sampleTurn.content);
    expect(result.audioBase64).toBe(Buffer.from("audio").toString("base64"));
  });

  it("marks a pending learner turn failed when TTS fails", async () => {
    const { calls, dependencies } = createDependencies();
    const service = new VoiceTutorService(
      { transcribe: async () => ({ text: "unused" }) },
      { generateTutorReply: async () => sampleTurn },
      {
        synthesize: async () => {
          throw new Error("TTS unavailable");
        },
      },
      dependencies as any
    );

    await expect(service.processTextInteraction("conversation-id", "I had a good day")).rejects.toThrow(
      "TTS unavailable"
    );
    expect(calls.failed).toMatchObject({
      id: "user-message-id",
      failure: { stage: "tts", code: "tutor_tts_failed", retryable: true },
    });
    expect(calls.complete).toBeUndefined();
  });

  it("processes a streaming interaction with sentence-level TTS chunks", async () => {
    const { calls, dependencies } = createDependencies();
    const audioChunks: any[] = [];
    const service = new VoiceTutorService(
      { transcribe: async () => ({ text: "I went to market" }) },
      {
        generateTutorReply: async (params: any) => {
          if (params.onSentenceChunk) {
            await params.onSentenceChunk("Very good!");
            await params.onSentenceChunk("What did you buy?");
          }
          return sampleTurn;
        },
      },
      {
        synthesize: async (text: string) => ({
          audioBuffer: Buffer.from(`audio-${text}`),
          mimeType: "audio/wav",
          format: "wav" as const,
        }),
      },
      dependencies as any
    );

    const result = await service.processStreamingInteraction({
      conversationId: "conversation-id",
      input: { type: "text", text: "I went to market" },
      onAudioChunk: (chunk) => {
        audioChunks.push(chunk);
      },
    });

    expect(result).toBeDefined();
    expect(audioChunks.length).toBe(2);
    expect(audioChunks[0].text).toBe("Very good!");
    expect(audioChunks[1].text).toBe("What did you buy?");
    expect(calls.complete.turnId).toBe("turn-id");
  });
});
