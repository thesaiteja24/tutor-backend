import type { FastifyPluginAsync } from "fastify";

import { formatSuccessResponse } from "@/shared/utils/response.ts";

import {
  changePasswordRouteDoc,
  confirmChangeEmailRouteDoc,
  forgotPasswordRouteDoc,
  getMeRouteDoc,
  loginRouteDoc,
  registerRouteDoc,
  requestChangeEmailRouteDoc,
  resendOtpRouteDoc,
  resetPasswordRouteDoc,
  verifyEmailRouteDoc,
} from "./auth.docs.ts";
import { authenticateUser } from "./auth.middleware.ts";
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

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/register
  fastify.post(
    "/register",
    { schema: registerRouteDoc },
    async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const result = await authService.register(input);
      return reply.code(201).send(
        formatSuccessResponse(request, "Account registration initiated", result),
      );
    },
  );

  // POST /api/v1/auth/verify-email
  fastify.post(
    "/verify-email",
    { schema: verifyEmailRouteDoc },
    async (request, reply) => {
      const input = verifyEmailSchema.parse(request.body);
      const result = await authService.verifyEmail(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Email verified successfully", result),
      );
    },
  );

  // POST /api/v1/auth/resend-otp
  fastify.post(
    "/resend-otp",
    { schema: resendOtpRouteDoc },
    async (request, reply) => {
      const input = resendOtpSchema.parse(request.body);
      const result = await authService.resendOtp(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Verification code sent", result),
      );
    },
  );

  // POST /api/v1/auth/login
  fastify.post(
    "/login",
    { schema: loginRouteDoc },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const meta = {
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      };
      const result = await authService.login(input, meta);
      return reply.code(200).send(
        formatSuccessResponse(request, "Login successful", result),
      );
    },
  );

  // POST /api/v1/auth/forgot-password
  fastify.post(
    "/forgot-password",
    { schema: forgotPasswordRouteDoc },
    async (request, reply) => {
      const input = forgotPasswordSchema.parse(request.body);
      const result = await authService.forgotPassword(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Reset code dispatched", result),
      );
    },
  );

  // POST /api/v1/auth/reset-password
  fastify.post(
    "/reset-password",
    { schema: resetPasswordRouteDoc },
    async (request, reply) => {
      const input = resetPasswordSchema.parse(request.body);
      const result = await authService.resetPassword(input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Password reset successful", result),
      );
    },
  );

  // POST /api/v1/auth/change-password (Authenticated In-App)
  fastify.post(
    "/change-password",
    {
      preHandler: [authenticateUser],
      schema: changePasswordRouteDoc,
    },
    async (request, reply) => {
      const input = changePasswordSchema.parse(request.body);
      const userId = request.user!.userId;
      const result = await authService.changePassword(userId, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Password updated successfully", result),
      );
    },
  );

  // POST /api/v1/auth/change-email/request (Authenticated In-App)
  fastify.post(
    "/change-email/request",
    {
      preHandler: [authenticateUser],
      schema: requestChangeEmailRouteDoc,
    },
    async (request, reply) => {
      const input = requestChangeEmailSchema.parse(request.body);
      const userId = request.user!.userId;
      const result = await authService.requestChangeEmail(userId, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Email change verification code dispatched", result),
      );
    },
  );

  // POST /api/v1/auth/change-email/confirm (Authenticated In-App)
  fastify.post(
    "/change-email/confirm",
    {
      preHandler: [authenticateUser],
      schema: confirmChangeEmailRouteDoc,
    },
    async (request, reply) => {
      const input = confirmChangeEmailSchema.parse(request.body);
      const userId = request.user!.userId;
      const result = await authService.confirmChangeEmail(userId, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Email changed successfully", result),
      );
    },
  );

  // GET /api/v1/auth/me (Authenticated Profile Check)
  fastify.get(
    "/me",
    {
      preHandler: [authenticateUser],
      schema: getMeRouteDoc,
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const user = await authService.getMe(userId);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile retrieved successfully", user),
      );
    },
  );
};
