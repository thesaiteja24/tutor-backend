import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { uuidv7 } from "uuidv7";

import { env } from "@/config/index.ts";

const rateLimitPluginAsync: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    errorResponseBuilder: (request, context) => ({
      success: false,
      message: `Rate limit exceeded, retry in ${context.after}`,
      errors: [
        {
          code: "rate_limit_exceeded",
          message: `Too many requests. Limit is ${context.max} requests per ${context.after}`,
          details: null,
        },
      ],
      meta: {
        timestamp: new Date().toISOString(),
        requestId: (request.id as string) || uuidv7(),
      },
    }),
  });
};

export const rateLimitPlugin = fp(rateLimitPluginAsync, {
  name: "rate-limit-plugin",
});
