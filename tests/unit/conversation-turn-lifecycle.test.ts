import { describe, expect, it } from "bun:test";
import { ConversationService } from "@/modules/conversations/conversation.services.ts";

describe("conversation turn lifecycle", () => {
  it("persists the canonical learner transcript when a turn begins", async () => {
    let received: any;
    const repo = {
      createPendingUserMessage: async (data: any) => {
        received = data;
        return { turnId: "01950000-0000-7000-8000-000000000099", message: { id: "01950000-0000-7000-8000-000000000100" } };
      },
    };
    const service = new ConversationService(repo as any);

    await service.beginUserTurn({
      conversationId: "01950000-0000-7000-8000-000000000010",
      transcript: "I am feeling great",
      transcriptMetadata: { source: "audio", requestedLanguage: "te" },
      latencyMetrics: { sttMs: 950 },
    });

    expect(received).toEqual({
      conversationId: "01950000-0000-7000-8000-000000000010",
      content: "I am feeling great",
      transcriptMetadata: { source: "audio", requestedLanguage: "te" },
      latencyMetrics: { sttMs: 950 },
    });
  });

  it("completes the exact pending learner turn with its assistant reply", async () => {
    let received: any;
    const repo = {
      completeTurn: async (data: any) => {
        received = data;
        return { id: "01950000-0000-7000-8000-000000000101" };
      },
    };
    const service = new ConversationService(repo as any);

    await service.completeUserTurn({
      conversationId: "01950000-0000-7000-8000-000000000010",
      turnId: "01950000-0000-7000-8000-000000000099",
      userMessageId: "01950000-0000-7000-8000-000000000100",
      assistantMessage: { content: "That sounds great! What did you enjoy today?" },
    });

    expect(received.turnId).toBe("01950000-0000-7000-8000-000000000099");
    expect(received.userMessageId).toBe("01950000-0000-7000-8000-000000000100");
    expect(received.assistantMessage.content).toBe("That sounds great! What did you enjoy today?");
  });

  it("marks a pending turn as failed with retry-safe stage metadata", async () => {
    let received: any;
    const repo = {
      failPendingTurn: async (messageId: string, failure: any) => {
        received = { messageId, failure };
        return true;
      },
    };
    const service = new ConversationService(repo as any);

    const result = await service.failUserTurn("01950000-0000-7000-8000-000000000100", {
      stage: "tts",
      code: "tutor_tts_failed",
      retryable: true,
      occurredAt: "2026-09-27T12:00:00.000Z",
    });

    expect(result).toBe(true);
    expect(received).toEqual({
      messageId: "01950000-0000-7000-8000-000000000100",
      failure: {
        stage: "tts",
        code: "tutor_tts_failed",
        retryable: true,
        occurredAt: "2026-09-27T12:00:00.000Z",
      },
    });
  });

  it("generates dynamic opening greeting and synthesizes audio on conversation creation", async () => {
    let addedMessage: any;
    const repo = {
      create: async (data: any) => ({
        id: "01950000-0000-7000-8000-000000000010",
        ...data,
      }),
      addMessage: async (data: any) => {
        addedMessage = data;
        return {
          id: "01950000-0000-7000-8000-000000000102",
          ...data,
        };
      },
    };

    const mockLlm = {
      generateTutorReply: async () => ({
        content: "Hey there! Ready to practice speaking English?",
        special: null,
        copiable: null,
        options: null,
        correction: null,
        learningState: { topic: "General", targetSkill: "fluency", introducedTerms: [] },
      }),
    };

    const mockTts = {
      synthesize: async () => ({
        audioBuffer: Buffer.from("mock-audio-bytes"),
        mimeType: "audio/wav",
        format: "wav" as const,
      }),
    };

    const service = new ConversationService(repo as any, mockLlm as any, mockTts as any);
    const result = await service.createConversation({
      personaId: "01950000-0000-7000-8000-000000000001",
      practiceModeId: "01950000-0000-7000-9000-000000000001",
    });

    expect(result.id).toBe("01950000-0000-7000-8000-000000000010");
    expect(result.messages.length).toBe(1);
    expect(result.messages[0]?.audioUrl).toContain("_greeting.wav");
    expect(addedMessage.audioUrl).toContain("_greeting.wav");
  });
});
