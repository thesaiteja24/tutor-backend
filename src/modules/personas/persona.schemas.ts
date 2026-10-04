import { z } from "zod";

export const personaResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  voiceId: z.string(),
  avatarUrl: z.string().nullable().optional(),
  sampleAudioUrl: z.string().nullable().optional(),
  previewAudiosByLang: z.record(z.string(), z.string()).nullable().optional(),
  description: z.string(),
  systemPrompt: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const createPersonaSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  voiceId: z.string().trim().min(1).default("shubh"),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
  systemPrompt: z.string().trim().min(10, "System prompt must be at least 10 characters"),
});

export const updatePersonaSchema = createPersonaSchema.partial();

export const listPersonasQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getPersonaParamsSchema = z.object({
  id: z.string().uuid(),
});

export type PersonaResponse = z.infer<typeof personaResponseSchema>;
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
export type ListPersonasQuery = z.infer<typeof listPersonasQuerySchema>;
export type GetPersonaParams = z.infer<typeof getPersonaParamsSchema>;
