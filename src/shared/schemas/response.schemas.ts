import { z } from "zod";

export const responseMetaSchema = z.object({
  timestamp: z.string(),
  requestId: z.string(),
});

export const paginatedMetaSchema = responseMetaSchema.extend({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative().optional(),
  hasMore: z.boolean().optional(),
  prevCursor: z.string().optional(),
  nextCursor: z.string().optional(),
});

export const errorDetailSchema = z.object({
  code: z.string(),
  field: z.string().optional(),
  message: z.string(),
  details: z.unknown().optional().nullable(),
});

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(errorDetailSchema),
  meta: responseMetaSchema,
});

export function createSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
    meta: responseMetaSchema,
  });
}

export function createPaginatedEnvelopeSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(itemSchema),
    meta: paginatedMetaSchema,
  });
}

export type ResponseMeta = z.infer<typeof responseMetaSchema>;
export type PaginatedMeta = z.infer<typeof paginatedMetaSchema>;
export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
