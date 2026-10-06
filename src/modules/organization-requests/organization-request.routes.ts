import type { FastifyPluginAsync } from "fastify";

import { authenticateUser, requireRole } from "@/modules/auth/auth.middleware.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";

import {
  createOrganizationRequestSchema,
  listOrganizationRequestsQuerySchema,
  organizationRequestIdParamsSchema,
  rejectOrganizationRequestSchema,
} from "./organization-request.schemas.ts";
import { organizationRequestService } from "./organization-request.services.ts";

export const organizationRequestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticateUser);

  fastify.post("/", async (request, reply) => {
    const input = createOrganizationRequestSchema.parse(request.body);
    const created = await organizationRequestService.create(request.user!.userId, input);
    return reply.code(201).send(formatSuccessResponse(request, "Organization request submitted for review.", created));
  });

  fastify.get("/me", async (request, reply) => {
    const requests = await organizationRequestService.listMine(request.user!.userId);
    return reply.code(200).send(formatSuccessResponse(request, "Your organization requests retrieved successfully.", requests));
  });
};

export const adminOrganizationRequestRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticateUser);
  fastify.addHook("preHandler", requireRole("superadmin"));

  fastify.get("/", async (request, reply) => {
    const query = listOrganizationRequestsQuerySchema.parse(request.query);
    const result = await organizationRequestService.list(query);
    return reply.code(200).send(formatPaginatedResponse(request, "Organization requests retrieved successfully.", result.rows, {
      total: result.total, limit: query.limit, offset: query.offset,
    }));
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = organizationRequestIdParamsSchema.parse(request.params);
    return reply.code(200).send(formatSuccessResponse(request, "Organization request retrieved successfully.", await organizationRequestService.get(id)));
  });

  fastify.post("/:id/approve", async (request, reply) => {
    const { id } = organizationRequestIdParamsSchema.parse(request.params);
    const result = await organizationRequestService.approve(id, request.user!.userId);
    return reply.code(200).send(formatSuccessResponse(request, "Organization request approved successfully.", result));
  });

  fastify.post("/:id/reject", async (request, reply) => {
    const { id } = organizationRequestIdParamsSchema.parse(request.params);
    const { reason } = rejectOrganizationRequestSchema.parse(request.body);
    const result = await organizationRequestService.reject(id, request.user!.userId, reason);
    return reply.code(200).send(formatSuccessResponse(request, "Organization request rejected successfully.", result));
  });
};
