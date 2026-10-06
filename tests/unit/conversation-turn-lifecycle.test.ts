import { describe, expect, it } from "bun:test";

import { type ConversationRepository } from "@/modules/conversations/conversation.repositories.ts";
import { ConversationService } from "@/modules/conversations/conversation.services.ts";
import { type LLMProvider, type TTSProvider } from "@/shared/ai/index.ts";

describe("conversation turn lifecycle", () => {
  it("persists the canonical learner transcript when a turn begins", async () => {
    let received: Record<string, unknown> | undefined;
    const repo = {
      createPendingUserMessage: async (data: Record<string, unknown>) => {
        received = data;
        return { turnId: "01950000-0000-7000-8000-000000000099", message: { id: "01950000-0000-7000-8000-000000000100" } };
      },
    };
    const service = new ConversationService(repo as unknown as ConversationRepository);

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
    let received: { turnId?: string; userMessageId?: string; assistantMessage?: { content?: string } } | undefined;
    const repo = {
      completeTurn: async (data: { turnId: string; userMessageId: string; assistantMessage: { content: string } }) => {
        received = data;
        return { id: "01950000-0000-7000-8000-000000000101" };
      },
    };
    const service = new ConversationService(repo as unknown as ConversationRepository);

    await service.completeUserTurn({
      conversationId: "01950000-0000-7000-8000-000000000010",
      turnId: "01950000-0000-7000-8000-000000000099",
      userMessageId: "01950000-0000-7000-8000-000000000100",
      assistantMessage: { content: "That sounds great! What did you enjoy today?" },
    });

    expect(received?.turnId).toBe("01950000-0000-7000-8000-000000000099");
    expect(received?.userMessageId).toBe("01950000-0000-7000-8000-000000000100");
    expect(received?.assistantMessage?.content).toBe("That sounds great! What did you enjoy today?");
  });

  it("marks a pending turn as failed with retry-safe stage metadata", async () => {
    let received: { messageId: string; failure: Record<string, unknown> } | undefined;
    const repo = {
      failPendingTurn: async (messageId: string, failure: Record<string, unknown>) => {
        received = { messageId, failure };
        return true;
      },
    };
    const service = new ConversationService(repo as unknown as ConversationRepository);

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
    let addedMessage: { audioUrl?: string } | undefined;
    const repo = {
      create: async (data: Record<string, unknown>) => ({
        id: "01950000-0000-7000-8000-000000000010",
        ...data,
      }),
      addMessage: async (data: { audioUrl?: string }) => {
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

    const mockDomain = {
      personas: {
        getPersonaById: async () => ({
          id: "01950000-0000-7000-8000-000000000001",
          name: "Maya",
          voiceId: "priya",
          systemPrompt: "You are Maya, a friendly English tutor.",
        }),
      },
      practiceModes: {
        getPracticeModeById: async () => ({
          id: "01950000-0000-7000-9000-000000000001",
          name: "AI Live Tutor",
          systemPrompt: "Practice conversational English.",
        }),
        listPracticeModes: async () => ({ items: [], total: 0 }),
      },
      users: {
        getUserById: async () => ({ nativeLanguage: "te", englishLevel: "intermediate" }),
      },
    };

    const service = new ConversationService(
      repo as unknown as ConversationRepository,
      mockLlm as unknown as LLMProvider,
      mockTts as unknown as TTSProvider,
      mockDomain as unknown as ConstructorParameters<typeof ConversationService>[3],
    );
    const result = await service.createConversation("01950000-0000-7000-8000-000000000020", {
      personaId: "01950000-0000-7000-8000-000000000001",
      practiceModeId: "01950000-0000-7000-9000-000000000001",
    });

    expect(result.id).toBe("01950000-0000-7000-8000-000000000010");
    expect(result.messages.length).toBe(1);
    expect(result.messages[0]?.audioUrl).toContain("_greeting.wav");
    expect(addedMessage?.audioUrl).toContain("_greeting.wav");
  });
});
