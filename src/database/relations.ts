import { relations } from "drizzle-orm";

import { conversations } from "@/database/schema/conversations.ts";
import { messages } from "@/database/schema/messages.ts";
import { organizationRequestReminders, organizationRequests } from "@/database/schema/organization-requests.ts";
import { organizations } from "@/database/schema/organizations.ts";
import { personas } from "@/database/schema/personas.ts";
import { practiceModes } from "@/database/schema/practice-modes.ts";
import { users } from "@/database/schema/users.ts";

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  organizationRequests: many(organizationRequests, { relationName: "organizationRequester" }),
  organizationRequestsReviewed: many(organizationRequests, { relationName: "organizationReviewer" }),
  organizationsCreated: many(organizations, { relationName: "organizationCreator" }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, { relationName: "organizationCreator", fields: [organizations.createdBy], references: [users.id] }),
  requests: many(organizationRequests),
}));

export const organizationRequestsRelations = relations(organizationRequests, ({ one, many }) => ({
  requester: one(users, { relationName: "organizationRequester", fields: [organizationRequests.requesterId], references: [users.id] }),
  organization: one(organizations, { fields: [organizationRequests.organizationId], references: [organizations.id] }),
  reviewer: one(users, { relationName: "organizationReviewer", fields: [organizationRequests.reviewedBy], references: [users.id] }),
  reminders: many(organizationRequestReminders),
}));

export const organizationRequestRemindersRelations = relations(organizationRequestReminders, ({ one }) => ({
  request: one(organizationRequests, { fields: [organizationRequestReminders.requestId], references: [organizationRequests.id] }),
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
