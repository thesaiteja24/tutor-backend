import { z } from "zod";

import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";

export const practiceModeResponseSchema = z.strictObject({
  id: uuidv7Schema,
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const createPracticeModeSchema = z.strictObject({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
  systemPrompt: z.string().trim().min(10, "System prompt must be at least 10 characters"),
});

export const updatePracticeModeSchema = createPracticeModeSchema.partial();

export const listPracticeModesQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getPracticeModeParamsSchema = z.strictObject({
  id: uuidv7Schema,
});

export type PracticeModeResponse = z.infer<typeof practiceModeResponseSchema>;
export type CreatePracticeModeInput = z.infer<typeof createPracticeModeSchema>;
export type UpdatePracticeModeInput = z.infer<typeof updatePracticeModeSchema>;
export type ListPracticeModesQuery = z.infer<typeof listPracticeModesQuerySchema>;
export type GetPracticeModeParams = z.infer<typeof getPracticeModeParamsSchema>;
