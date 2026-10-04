import type { FastifyPluginAsync } from "fastify";
import { devLogger, type LogLevel } from "@/shared/utils/dev-logger.ts";
import { db } from "@/database/index.ts";
import { messages } from "@/database/schema/messages.ts";
import { desc, isNotNull } from "drizzle-orm";
import { formatSuccessResponse } from "@/shared/utils/response.ts";

export const devRoutes: FastifyPluginAsync = async (fastify) => {
  // Only enable in development / test environments
  if (process.env.NODE_ENV === "production") {
    return;
  }

  fastify.post<{
    Body: {
      level?: LogLevel;
      tag?: string;
      message: string;
      data?: any;
      error?: any;
    };
  }>("/logs", async (request, reply) => {
    const { level, tag, message, data, error } = request.body || {};
    if (message) {
      devLogger.logMobile({
        level: level || "INFO",
        tag: tag || "MobileApp",
        message,
        data,
        error,
      });
    }
    return reply.code(200).send({ success: true });
  });

  // GET /api/v1/dev/metrics -> Telemetry metrics summary
  fastify.get("/metrics", async (request, reply) => {
    const recentMessages = await db
      .select({
        id: messages.id,
        sender: messages.sender,
        status: messages.status,
        metrics: messages.latencyMetrics,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(isNotNull(messages.latencyMetrics))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const completed = recentMessages.filter((m) => m.metrics && m.status === "completed");
    const sttTimes = completed.map((m) => m.metrics?.sttMs || 0).filter((v) => v > 0);
    const llmTimes = completed.map((m) => m.metrics?.llmMs || 0).filter((v) => v > 0);
    const ttsTimes = completed.map((m) => m.metrics?.ttsMs || 0).filter((v) => v > 0);
    const ttfaTimes = completed.map((m) => m.metrics?.ttfaMs || 0).filter((v) => v > 0);
    const totalTimes = completed.map((m) => m.metrics?.totalMs || 0).filter((v) => v > 0);

    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
    const p95 = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] || 0;
    };

    const telemetry = {
      sampleSize: recentMessages.length,
      completedTurns: completed.length,
      averages: {
        sttMs: avg(sttTimes),
        llmMs: avg(llmTimes),
        ttsMs: avg(ttsTimes),
        ttfaMs: avg(ttfaTimes),
        totalMs: avg(totalTimes),
      },
      p95: {
        sttMs: p95(sttTimes),
        llmMs: p95(llmTimes),
        ttsMs: p95(ttsTimes),
        ttfaMs: p95(ttfaTimes),
        totalMs: p95(totalTimes),
      },
      recentTurns: completed.slice(0, 5).map((m) => ({
        id: m.id,
        createdAt: m.createdAt,
        metrics: m.metrics,
      })),
    };

    return reply.code(200).send(
      formatSuccessResponse(request, "Telemetry metrics retrieved successfully", telemetry)
    );
  });
};
