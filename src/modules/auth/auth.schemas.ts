import { z } from "zod";
import { PASSWORD_ERROR_MESSAGE, PASSWORD_REGEX } from "@/shared/auth/password.ts";

export const registerSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").max(255).toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters")
    .regex(PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE),
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  nativeLanguage: z.string().trim().min(2).max(20).default("te"),
  englishLevel: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  otp: z.string().trim().length(6, "Verification code must be exactly 6 digits").regex(/^\d{6}$/, "Code must contain only digits"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendOtpSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  purpose: z.enum(["email_verification", "password_reset"]).default("email_verification"),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  otp: z.string().trim().length(6, "Reset code must be exactly 6 digits").regex(/^\d{6}$/, "Code must contain only digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters")
    .regex(PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters")
    .regex(PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const requestChangeEmailSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newEmail: z.string().trim().email("Please provide a valid email address").max(255).toLowerCase(),
});

export type RequestChangeEmailInput = z.infer<typeof requestChangeEmailSchema>;

export const confirmChangeEmailSchema = z.object({
  newEmail: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  otp: z.string().trim().length(6, "Verification code must be exactly 6 digits").regex(/^\d{6}$/, "Code must contain only digits"),
});

export type ConfirmChangeEmailInput = z.infer<typeof confirmChangeEmailSchema>;

