import type { FastifyPluginAsync } from "fastify";

import { adminOrganizationRequestRoutes } from "@/modules/organization-requests/index.ts";

import { adminAnalyticsRoutes } from "./analytics/index.ts";
import { adminPersonaRoutes } from "./personas/index.ts";
import { adminPracticeModeRoutes } from "./practice-modes/index.ts";
import { adminUserRoutes } from "./users/index.ts";

export const adminModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(adminAnalyticsRoutes, { prefix: "/analytics" });
  await fastify.register(adminPersonaRoutes, { prefix: "/personas" });
  await fastify.register(adminPracticeModeRoutes, { prefix: "/practice-modes" });
  await fastify.register(adminUserRoutes, { prefix: "/users" });
  await fastify.register(adminOrganizationRequestRoutes, { prefix: "/organization-requests" });
};
