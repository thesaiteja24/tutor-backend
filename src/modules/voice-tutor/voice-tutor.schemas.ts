import { z } from "zod";

import { latencyMetricsSchema } from "@/modules/conversations/conversation.schemas.ts";
import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";

export const voiceInteractParamsSchema = z.strictObject({
  conversationId: uuidv7Schema,
});

export const textInteractBodySchema = z.strictObject({
  text: z.string().trim().min(1, "Text is required").max(2000).optional(),
  voiceId: z.string().trim().min(1).max(50).optional(),
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

export const voiceInteractResponseSchema = z.strictObject({
  userTranscript: z.string(),
  audioBase64: z.string(),
  audioFormat: z.string(),
  latencyMetrics: latencyMetricsSchema,
  userMessageId: uuidv7Schema,
  assistantMessageId: uuidv7Schema,
  turn: z.unknown().optional(),
});

export type VoiceInteractParams = z.infer<typeof voiceInteractParamsSchema>;
export type TextInteractBody = z.infer<typeof textInteractBodySchema>;
export type VoiceInteractResponse = z.infer<typeof voiceInteractResponseSchema>;
