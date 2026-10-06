import { describe, expect, it } from "bun:test";

import type { ConversationRepository } from "@/modules/conversations/conversation.repositories.ts";
import { ConversationService } from "@/modules/conversations/conversation.services.ts";

const userId = "01950000-0000-7000-8000-000000000010";
const otherUserId = "01950000-0000-7000-8000-000000000011";
const conversationId = "01950000-0000-7000-8000-000000000020";

describe("conversation ownership", () => {
  it("always scopes conversation lists to the authenticated user", async () => {
    let receivedUserId: string | undefined;
    const repo = {
      findManyForUser: async (id: string) => {
        receivedUserId = id;
        return { items: [], total: 0 };
      },
    };
    const service = new ConversationService(repo as unknown as ConversationRepository);

    await service.listConversations(userId, { limit: 20, offset: 0, status: "active" });

    expect(receivedUserId).toBe(userId);
    expect(receivedUserId).not.toBe(otherUserId);
  });

  it("does not expose a conversation owned by another user", async () => {
    const repo = {
      findWithMessagesForUser: async (id: string, scopedUserId: string) => {
        expect(id).toBe(conversationId);
        expect(scopedUserId).toBe(userId);
        return null;
      },
    };
    const service = new ConversationService(repo as unknown as ConversationRepository);

    await expect(service.getConversationWithHistory(userId, conversationId)).rejects.toThrow("not found");
  });

  it("does not update or delete a conversation outside the authenticated user scope", async () => {
    const repo = {
      findByIdForUser: async () => null,
      updateForUser: async () => null,
      softDeleteForUser: async () => false,
    };
    const service = new ConversationService(repo as unknown as ConversationRepository);

    await expect(service.updateConversation(userId, conversationId, { title: "Changed" })).rejects.toThrow("not found");
    await expect(service.deleteConversation(userId, conversationId)).rejects.toThrow("not found");
  });
});
