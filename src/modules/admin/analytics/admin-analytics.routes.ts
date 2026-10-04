import type { FastifyPluginAsync } from "fastify";

import { authenticateUser, requireRole } from "@/modules/auth/auth.middleware.ts";
import { formatSuccessResponse } from "@/shared/utils/response.ts";

import { adminAnalyticsService } from "./admin-analytics.services.ts";

export const adminAnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Enforce superadmin authorization across all admin analytics routes
  fastify.addHook("preHandler", authenticateUser);
  fastify.addHook("preHandler", requireRole("superadmin"));

  // GET /api/v1/admin/analytics/overview
  fastify.get(
    "/overview",
    {
      schema: {
        tags: ["Admin Analytics"],
        summary: "Retrieve platform overview KPIs & telemetry summary",
        description: "Returns aggregated user counts (DAU/WAU/MAU), total conversation turns, speaking duration, and estimated AI platform costs.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await adminAnalyticsService.getOverview();
      return reply.code(200).send(
        formatSuccessResponse(request, "Platform overview telemetry retrieved successfully", result),
      );
    },
  );

  // GET /api/v1/admin/analytics/costs
  fastify.get(
    "/costs",
    {
      schema: {
        tags: ["Admin Analytics"],
        summary: "Retrieve detailed AI infrastructure cost breakdown",
        description: "Calculates Sarvam Saaras STT minutes, Bulbul TTS minutes, and LLM token usage with unit economics per active learner.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await adminAnalyticsService.getCosts();
      return reply.code(200).send(
        formatSuccessResponse(request, "AI infrastructure cost analysis calculated successfully", result),
      );
    },
  );

  // GET /api/v1/admin/analytics/latency
  fastify.get(
    "/latency",
    {
      schema: {
        tags: ["Admin Analytics"],
        summary: "Retrieve latency distribution metrics (P50, P90, P95)",
        description: "Returns performance percentiles across STT audio processing, LLM generation, TTS synthesis, and End-to-End turnaround.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await adminAnalyticsService.getLatencyTelemetry();
      return reply.code(200).send(
        formatSuccessResponse(request, "Latency telemetry metrics retrieved successfully", result),
      );
    },
  );
};
