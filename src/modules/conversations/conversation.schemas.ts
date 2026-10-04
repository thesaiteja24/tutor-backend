import { z } from "zod";
import { personaResponseSchema } from "@/modules/personas/persona.schemas.ts";
import { practiceModeResponseSchema } from "@/modules/practice-modes/practice-mode.schemas.ts";

export const latencyMetricsSchema = z.object({
  sttMs: z.number().optional(),
  llmMs: z.number().optional(),
  ttsMs: z.number().optional(),
  ttfaMs: z.number().optional(),
  ttftMs: z.number().optional(),
  totalMs: z.number().optional(),
  streamChunks: z.number().optional(),
  cacheHit: z.boolean().optional(),
});

export const messageResponseSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  sender: z.enum(["user", "assistant"]),
  content: z.string(),
  audioUrl: z.string().nullable().optional(),
  latencyMetrics: latencyMetricsSchema.nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const conversationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  personaId: z.string().uuid(),
  practiceModeId: z.string().uuid(),
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

export const createConversationSchema = z.object({
  personaId: z.string().uuid("Invalid persona ID"),
  practiceModeId: z.string().uuid("Invalid practice mode ID").optional(),
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  customPrompt: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  customPrompt: z.string().trim().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  personaId: z.string().uuid().optional(),
  practiceModeId: z.string().uuid().optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
});

export const getConversationParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type GetConversationParams = z.infer<typeof getConversationParamsSchema>;
export type ConversationResponse = z.infer<typeof conversationResponseSchema>;
export type ConversationDetailResponse = z.infer<typeof conversationDetailResponseSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
