import type { FastifyPluginAsync } from "fastify";
import { formatSuccessResponse } from "@/shared/utils/response.ts";
import {
  changePasswordSchema,
  confirmChangeEmailSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  requestChangeEmailSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.ts";
import { authService } from "./auth.services.ts";
import { authenticateUser } from "./auth.middleware.ts";

const userProfileSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    displayName: { type: "string" },
    nativeLanguage: { type: "string" },
    englishLevel: { type: "string" },
    isEmailVerified: { type: "boolean" },
    authProvider: { type: "string" },
    isActive: { type: "boolean" },
    lastLoginAt: { type: "string", nullable: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const authSuccessSchema = {
  type: "object",
  properties: {
    user: userProfileSchema,
    token: { type: "string", description: "30-day JWT Bearer token" },
  },
};

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/register
  fastify.post(
    "/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Register new student account",
        description: "Validates password complexity (8+ chars, uppercase, lowercase, digit, special symbol), creates unverified account, and sends a 6-digit OTP verification email.",
        body: {
          type: "object",
          required: ["email", "password", "displayName"],
          properties: {
            email: { type: "string", format: "email", example: "student@example.com" },
            password: { type: "string", minLength: 8, example: "Password@123" },
            displayName: { type: "string", minLength: 2, example: "Sai Teja" },
            nativeLanguage: { type: "string", default: "te", example: "te" },
            englishLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"], default: "intermediate" },
          },
        },
        response: {
          201: {
            description: "Verification code sent",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Verification code sent to your email address." },
              data: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  displayName: { type: "string" },
                  message: { type: "string" },
                },
              },
              meta: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const result = await authService.register(input);
      return reply.code(201).send(
        formatSuccessResponse(request, "Account registration initiated", result)
      );
    }
  );

  // POST /api/v1/auth/verify-email
  fastify.post(
    "/verify-email",
    {
      schema: {
        tags: ["Auth"],
        summary: "Verify registration OTP code",
        description: "Validates 6-digit email OTP, marks account verified, dispatches Welcome email, and issues 30-day JWT.",
        body: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: { type: "string", format: "email", example: "student@example.com" },
            otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
          },
        },
        response: {
          200: {
            description: "Email verified successfully & authenticated",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Email verified successfully" },
              data: authSuccessSchema,
              meta: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = verifyEmailSchema.parse(request.body);
      const result = await authService.verifyEmail(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Email verified successfully", result)
      );
    }
  );

  // POST /api/v1/auth/resend-otp
  fastify.post(
    "/resend-otp",
    {
      schema: {
        tags: ["Auth"],
        summary: "Resend verification or reset OTP",
        description: "Dispatches a fresh 6-digit code (rate-limited to max 1 per 60 seconds).",
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "student@example.com" },
            purpose: { type: "string", enum: ["email_verification", "password_reset"], default: "email_verification" },
          },
        },
      },
    },
    async (request, reply) => {
      const input = resendOtpSchema.parse(request.body);
      const result = await authService.resendOtp(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Verification code sent", result)
      );
    }
  );

  // POST /api/v1/auth/login
  fastify.post(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Authenticate with email and password",
        description: "Validates credentials using argon2id, dispatches async New Login Alert email, and returns 30-day JWT token.",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "student@example.com" },
            password: { type: "string", example: "Password@123" },
          },
        },
        response: {
          200: {
            description: "Authentication successful",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Login successful" },
              data: authSuccessSchema,
              meta: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const meta = {
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      };
      const result = await authService.login(input, meta);
      return reply.code(200).send(
        formatSuccessResponse(request, "Login successful", result)
      );
    }
  );

  // POST /api/v1/auth/forgot-password
  fastify.post(
    "/forgot-password",
    {
      schema: {
        tags: ["Auth"],
        summary: "Request password reset OTP",
        description: "Sends a 6-digit password reset code to registered user email.",
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "student@example.com" },
          },
        },
      },
    },
    async (request, reply) => {
      const input = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotPassword(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Reset code dispatched", result)
      );
    }
  );

  // POST /api/v1/auth/reset-password
  fastify.post(
    "/reset-password",
    {
      schema: {
        tags: ["Auth"],
        summary: "Reset password using 6-digit OTP",
        description: "Validates reset OTP, updates password with argon2id hash, and sends Password Changed confirmation email.",
        body: {
          type: "object",
          required: ["email", "otp", "newPassword"],
          properties: {
            email: { type: "string", format: "email", example: "student@example.com" },
            otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
            newPassword: { type: "string", minLength: 8, example: "NewPassword@123" },
          },
        },
      },
    },
    async (request, reply) => {
      const input = resetPasswordSchema.parse(request.body);
      const result = await authService.resetPassword(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Password reset successful", result)
      );
    }
  );

  // POST /api/v1/auth/change-password (Authenticated In-App)
  fastify.post(
    "/change-password",
    {
      preHandler: [authenticateUser],
      schema: {
        tags: ["Auth"],
        summary: "Change password (In-App)",
        description: "Allows logged-in users to change password by verifying their current password and providing a new compliant password.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", example: "CurrentPassword@123" },
            newPassword: { type: "string", minLength: 8, example: "NewPassword@123" },
          },
        },
      },
    },
    async (request, reply) => {
      const input = changePasswordSchema.parse(request.body);
      const userId = request.user!.userId;
      const result = await authService.changePassword(userId, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Password updated successfully", result)
      );
    }
  );

  // POST /api/v1/auth/change-email/request (Authenticated In-App)
  fastify.post(
    "/change-email/request",
    {
      preHandler: [authenticateUser],
      schema: {
        tags: ["Auth"],
        summary: "Request email address change",
        description: "Requires current password verification and dispatches 6-digit OTP code to the new email address.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["currentPassword", "newEmail"],
          properties: {
            currentPassword: { type: "string", example: "CurrentPassword@123" },
            newEmail: { type: "string", format: "email", example: "newemail@example.com" },
          },
        },
      },
    },
    async (request, reply) => {
      const input = requestChangeEmailSchema.parse(request.body);
      const userId = request.user!.userId;
      const result = await authService.requestChangeEmail(userId, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Email change verification code dispatched", result)
      );
    }
  );

  // POST /api/v1/auth/change-email/confirm (Authenticated In-App)
  fastify.post(
    "/change-email/confirm",
    {
      preHandler: [authenticateUser],
      schema: {
        tags: ["Auth"],
        summary: "Confirm email address change",
        description: "Verifies the 6-digit OTP sent to the new email address and updates user email profile.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["newEmail", "otp"],
          properties: {
            newEmail: { type: "string", format: "email", example: "newemail@example.com" },
            otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
          },
        },
      },
    },
    async (request, reply) => {
      const input = confirmChangeEmailSchema.parse(request.body);
      const userId = request.user!.userId;
      const result = await authService.confirmChangeEmail(userId, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Email changed successfully", result)
      );
    }
  );

  // GET /api/v1/auth/me (Authenticated Profile Check)
  fastify.get(
    "/me",
    {
      preHandler: [authenticateUser],
      schema: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        description: "Returns profile details from the verified Bearer JWT.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "User profile retrieved" },
              data: userProfileSchema,
              meta: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const user = await authService.getMe(userId);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile retrieved successfully", user)
      );
    }
  );
};
