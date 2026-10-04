import { z } from "zod";

import { latencyMetricsSchema } from "@/modules/conversations/conversation.schemas.ts";

export const voiceInteractParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

export const textInteractBodySchema = z.object({
  text: z.string().trim().min(1, "Text is required").optional(),
  voiceId: z.string().optional(),
  activityId: z.string().trim().min(1).max(100).optional(),
  optionId: z.string().trim().min(1).max(100).optional(),
  optionLabel: z.string().trim().min(1).max(160).optional(),
}).superRefine((value, ctx) => {
  const selectionFields = [value.activityId, value.optionId, value.optionLabel];
  const hasSelection = selectionFields.some(Boolean);
  if (hasSelection && !selectionFields.every(Boolean)) {
    ctx.addIssue({ code: "custom", path: ["optionId"], message: "activityId, optionId, and optionLabel must be sent together" });
  }
  if (!value.text && !hasSelection) {
    ctx.addIssue({ code: "custom", path: ["text"], message: "Text or an activity selection is required" });
  }
});

export const voiceInteractResponseSchema = z.object({
  userTranscript: z.string(),
  audioBase64: z.string(),
  audioFormat: z.string(),
  latencyMetrics: latencyMetricsSchema,
  userMessageId: z.string().uuid(),
  assistantMessageId: z.string().uuid(),
  turn: z.unknown().optional(),
});

export type VoiceInteractParams = z.infer<typeof voiceInteractParamsSchema>;
export type TextInteractBody = z.infer<typeof textInteractBodySchema>;
export type VoiceInteractResponse = z.infer<typeof voiceInteractResponseSchema>;
