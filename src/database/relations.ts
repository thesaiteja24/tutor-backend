import { relations } from "drizzle-orm";
import { conversations } from "@/database/schema/conversations.ts";
import { messages } from "@/database/schema/messages.ts";
import { personas } from "@/database/schema/personas.ts";
import { practiceModes } from "@/database/schema/practice-modes.ts";
import { users } from "@/database/schema/users.ts";

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const personasRelations = relations(personas, ({ many }) => ({
  conversations: many(conversations),
}));

export const practiceModesRelations = relations(practiceModes, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  persona: one(personas, {
    fields: [conversations.personaId],
    references: [personas.id],
  }),
  practiceMode: one(practiceModes, {
    fields: [conversations.practiceModeId],
    references: [practiceModes.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
