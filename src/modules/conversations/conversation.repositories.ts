import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { db } from "@/database/index.ts";
import {
  type Conversation,
  conversations,
  type NewConversation,
} from "@/database/schema/conversations.ts";
import {
  type Message,
  messages,
  type NewMessage,
  type TranscriptMetadata,
  type TurnFailureData,
} from "@/database/schema/messages.ts";
import type { Persona } from "@/database/schema/personas.ts";
import type { PracticeMode } from "@/database/schema/practice-modes.ts";

import type { ListConversationsQuery } from "./conversation.schemas.ts";

export type ConversationWithRelations = Conversation & {
  persona: Persona;
  practiceMode: PracticeMode | null;
};

export type ConversationWithHistory = ConversationWithRelations & {
  messages: Message[];
};

export class ConversationRepository {
  async findMany(query: ListConversationsQuery): Promise<{ items: Array<typeof conversations.$inferSelect>; total: number }> {
    const conditions: SQL[] = [isNull(conversations.deletedAt)];

    if (query.status && query.status !== "all") {
      conditions.push(eq(conversations.status, query.status));
    }

    if (query.personaId) {
      conditions.push(eq(conversations.personaId, query.personaId));
    }

    if (query.practiceModeId) {
      conditions.push(eq(conversations.practiceModeId, query.practiceModeId));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ total: count() })
      .from(conversations)
      .where(whereClause);

    const items = await db.query.conversations.findMany({
      where: whereClause,
      with: {
        persona: true,
        practiceMode: true,
      },
      orderBy: [desc(conversations.updatedAt)],
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items,
      total: Number(totalResult?.total || 0),
    };
  }

  async findById(id: string): Promise<ConversationWithRelations | null> {
    const row = await db.query.conversations.findMany({
      where: and(eq(conversations.id, id), isNull(conversations.deletedAt)),
      with: {
        persona: true,
        practiceMode: true,
      },
      limit: 1,
    });

    return (row[0] as unknown as ConversationWithRelations) || null;
  }

  async findWithMessages(id: string, messageLimit: number = 50): Promise<ConversationWithHistory | null> {
    const conversation = await this.findById(id);
    if (!conversation) return null;

    const messageList = await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, id), eq(messages.status, "completed"), isNull(messages.deletedAt)))
      .orderBy(asc(messages.createdAt))
      .limit(messageLimit);

    return {
      ...conversation,
      messages: messageList,
    };
  }

  async create(data: NewConversation): Promise<Conversation> {
    const [row] = await db.insert(conversations).values(data).returning();
    return row!;
  }

  async update(id: string, data: Partial<NewConversation>): Promise<Conversation | null> {
    const [row] = await db
      .update(conversations)
      .set(data)
      .where(and(eq(conversations.id, id), isNull(conversations.deletedAt)))
      .returning();

    return row || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const [row] = await db
      .update(conversations)
      .set({ deletedAt: new Date(), status: "archived" })
      .where(and(eq(conversations.id, id), isNull(conversations.deletedAt)))
      .returning();

    return !!row;
  }

  async addMessage(data: NewMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();

    // Touch conversation updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));

    return msg!;
  }

  async createPendingUserMessage(data: {
    conversationId: string;
    content: string;
    transcriptMetadata: TranscriptMetadata;
    latencyMetrics?: Record<string, number>;
  }): Promise<{ turnId: string; message: Message }> {
    const turnId = uuidv7();
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        sender: "user",
        turnId,
        status: "pending",
        content: data.content,
        transcriptMetadata: data.transcriptMetadata,
        latencyMetrics: data.latencyMetrics,
      })
      .returning();

    await this.touchConversation(data.conversationId);
    return { turnId, message: message! };
  }

  async completeTurn(data: {
    userMessageId: string;
    conversationId: string;
    turnId: string;
    assistantMessage: Omit<NewMessage, "conversationId" | "sender" | "turnId" | "status">;
  }): Promise<Message> {
    const assistantMessage = await db.transaction(async (tx) => {
      const [pendingUserMessage] = await tx
        .update(messages)
        .set({ status: "completed" })
        .where(and(eq(messages.id, data.userMessageId), eq(messages.turnId, data.turnId), eq(messages.status, "pending")))
        .returning({ id: messages.id });

      if (!pendingUserMessage) {
        throw new Error("The learner turn is no longer pending and cannot be completed");
      }

      const [assistant] = await tx
        .insert(messages)
        .values({
          ...data.assistantMessage,
          conversationId: data.conversationId,
          sender: "assistant",
          turnId: data.turnId,
          status: "completed",
        })
        .returning();

      await tx
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, data.conversationId));

      return assistant!;
    });

    return assistantMessage;
  }

  async failPendingTurn(userMessageId: string, failureData: TurnFailureData): Promise<boolean> {
    const [failedMessage] = await db
      .update(messages)
      .set({ status: "failed", failureData })
      .where(and(eq(messages.id, userMessageId), eq(messages.status, "pending")))
      .returning({ conversationId: messages.conversationId });

    if (!failedMessage) return false;
    await this.touchConversation(failedMessage.conversationId);
    return true;
  }

  async getRecentMessages(conversationId: string, limit: number = 10): Promise<Message[]> {
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.status, "completed"), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Return in chronological order
    return rows.reverse();
  }

  private async touchConversation(conversationId: string) {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }
}

export const conversationRepository = new ConversationRepository();
