import { z } from "zod";

import { personaResponseSchema } from "@/modules/personas/persona.schemas.ts";
import { practiceModeResponseSchema } from "@/modules/practice-modes/practice-mode.schemas.ts";
import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";

export const latencyMetricsSchema = z.strictObject({
  sttMs: z.number().nonnegative().optional(),
  llmMs: z.number().nonnegative().optional(),
  ttsMs: z.number().nonnegative().optional(),
  ttfaMs: z.number().nonnegative().optional(),
  ttftMs: z.number().nonnegative().optional(),
  totalMs: z.number().nonnegative().optional(),
  streamChunks: z.number().int().nonnegative().optional(),
  cacheHit: z.boolean().optional(),
});

export const messageResponseSchema = z.strictObject({
  id: uuidv7Schema,
  conversationId: uuidv7Schema,
  sender: z.enum(["user", "assistant"]),
  content: z.string(),
  audioUrl: z.string().nullable().optional(),
  latencyMetrics: latencyMetricsSchema.nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const conversationResponseSchema = z.strictObject({
  id: uuidv7Schema,
  userId: uuidv7Schema,
  personaId: uuidv7Schema,
  practiceModeId: uuidv7Schema,
  title: z.string(),
  customPrompt: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  persona: personaResponseSchema.optional(),
  practiceMode: practiceModeResponseSchema.optional(),
});

export const conversationDetailResponseSchema = conversationResponseSchema.extend({
  messages: z.array(messageResponseSchema),
});

export const createConversationSchema = z.strictObject({
  personaId: uuidv7Schema,
  practiceModeId: uuidv7Schema.optional(),
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  customPrompt: z.string().trim().optional(),
});

export const updateConversationSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  customPrompt: z.string().trim().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const listConversationsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  personaId: uuidv7Schema.optional(),
  practiceModeId: uuidv7Schema.optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
});

export const getConversationParamsSchema = z.strictObject({
  id: uuidv7Schema,
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type GetConversationParams = z.infer<typeof getConversationParamsSchema>;
export type ConversationResponse = z.infer<typeof conversationResponseSchema>;
export type ConversationDetailResponse = z.infer<typeof conversationDetailResponseSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
