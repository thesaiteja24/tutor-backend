import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { uuidv7 } from "uuidv7";
import { ZodError } from "zod";

import { adminModule } from "@/modules/admin/index.ts";
import { authRoutes } from "@/modules/auth/index.ts";
import { conversationRoutes } from "@/modules/conversations/index.ts";
import { devRoutes } from "@/modules/dev/dev.routes.ts";
import { organizationRequestRoutes } from "@/modules/organization-requests/index.ts";
import { personaRoutes } from "@/modules/personas/index.ts";
import { practiceModeRoutes } from "@/modules/practice-modes/index.ts";
import { userRoutes } from "@/modules/users/index.ts";
import { voiceTutorRoutes } from "@/modules/voice-tutor/index.ts";
import { appPlugins } from "@/plugins/index.ts";
import { AppError } from "@/shared/errors/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";
import { formatSuccessResponse } from "@/shared/utils/response.ts";

const requestStartTimes = new WeakMap<FastifyRequest, number>();

interface FastifyValidationError {
  instancePath?: string;
  params?: { missingProperty?: string };
  message?: string;
}

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      transport:
        process.env.NODE_ENV === "development"
          ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
          : undefined,
    },
    genReqId: (req) => (req.headers["x-request-id"] as string) || uuidv7(),
    requestIdHeader: "x-request-id",
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  });

  // Register Core Plugins
  await fastify.register(appPlugins);

  // Response Header Hook: Always attach X-Request-ID
  fastify.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", (request.id as string) || uuidv7());
  });

  // Dev Logging Hooks
  fastify.addHook("onRequest", async (request) => {
    requestStartTimes.set(request, performance.now());
    devLogger.info("HTTP:Request", `${request.method} ${request.url}`, {
      id: request.id,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
  });

  fastify.addHook("onResponse", async (request, reply) => {
    const startTime = requestStartTimes.get(request) || performance.now();
    const elapsed = Math.round(performance.now() - startTime);
    devLogger.info("HTTP:Response", `${request.method} ${request.url} -> ${reply.statusCode} (${elapsed}ms)`, {
      id: request.id,
      statusCode: reply.statusCode,
      elapsedMs: elapsed,
    });
  });

  // Global Error Handler
  fastify.setErrorHandler((error: Error & { statusCode?: number; validation?: FastifyValidationError[]; issues?: unknown[] }, request: FastifyRequest, reply: FastifyReply) => {
    const timestamp = new Date().toISOString();
    const requestId = (request.id as string) || uuidv7();

    devLogger.error("HTTP:Error", `${request.method} ${request.url} failed: ${error.message}`, error, {
      requestId,
      method: request.method,
      url: request.url,
    });

    // 1. Handle Zod Validation Errors
    if (error instanceof ZodError) {
      const fieldErrors = error.issues.map((issue) => ({
        code: "validation_error",
        field: issue.path.join(".") || undefined,
        message: issue.message,
        details: issue,
      }));

      return reply.code(400).send({
        success: false,
        message: "Invalid request payload or parameters",
        errors: fieldErrors.length > 0 ? fieldErrors : [{ code: "validation_error", message: error.message }],
        meta: { timestamp, requestId },
      });
    }

    if (error.validation && Array.isArray(error.validation)) {
      const validationErrors = error.validation.map((v) => ({
        code: "validation_error",
        field: v.instancePath?.replace(/^\//, "").replace(/\//g, ".") || (v.params?.missingProperty as string) || undefined,
        message: v.message || "Invalid value",
        details: v,
      }));

      return reply.code(400).send({
        success: false,
        message: "Invalid request payload or parameters",
        errors: validationErrors,
        meta: { timestamp, requestId },
      });
    }

    // 2. Handle Custom App Errors
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        message: error.message,
        errors: error.errors,
        meta: { timestamp, requestId },
      });
    }

    // 3. Fastify HTTP Errors (e.g. 404, rate limits, 500)
    const statusCode = error.statusCode || 500;
    request.log.error(error);

    const isDev = process.env.NODE_ENV !== "production";
    const userMessage = isDev || statusCode < 500 ? error.message : "An unexpected error occurred";

    return reply.code(statusCode).send({
      success: false,
      message: userMessage,
      errors: [
        {
          code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "error",
          message: error.message,
          details: isDev ? error.stack : null,
        },
      ],
      meta: { timestamp, requestId },
    });
  });

  // Health Check Endpoint
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["System"],
        summary: "System health check",
        description: "Returns application status and uptime.",
      },
    },
    async (request, reply) => {
      return reply.code(200).send(
        formatSuccessResponse(request, "Service is healthy", {
          status: "healthy",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        }),
      );
    },
  );

  // Register Domain Modules under /api/v1
  await fastify.register(
    async (api) => {
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(userRoutes, { prefix: "/users" });
      await api.register(personaRoutes, { prefix: "/personas" });
      await api.register(practiceModeRoutes, { prefix: "/practice-modes" });
      await api.register(organizationRequestRoutes, { prefix: "/organization-requests" });
      await api.register(conversationRoutes, { prefix: "/conversations" });
      await api.register(voiceTutorRoutes, { prefix: "/voice-tutor" });
      await api.register(adminModule, { prefix: "/admin" });
      await api.register(devRoutes, { prefix: "/dev" });
    },
    { prefix: "/api/v1" },
  );

  return fastify;
}
