import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  nativeLanguage: z.string().default("te"),
  englishLevel: z.string(),
  isActive: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const getUserParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  nativeLanguage: z.enum(["te", "hi", "ta", "kn", "bn", "mr", "gu", "pa", "ml", "en"]).optional(),
  englishLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
export type GetUserParams = z.infer<typeof getUserParamsSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
