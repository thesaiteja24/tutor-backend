import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { authenticateUser, requireRole } from "@/modules/auth/auth.middleware.ts";
import {
  createPracticeModeSchema,
  listPracticeModesQuerySchema,
  updatePracticeModeSchema,
} from "@/modules/practice-modes/practice-mode.schemas.ts";
import { practiceModeService } from "@/modules/practice-modes/practice-mode.services.ts";
import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";
import { formatPaginatedResponse,formatSuccessResponse } from "@/shared/utils/response.ts";

const practiceModeIdParamSchema = z.strictObject({
  id: uuidv7Schema,
});

export const adminPracticeModeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticateUser);
  fastify.addHook("preHandler", requireRole("superadmin"));

  // GET /api/v1/admin/practice-modes
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Admin Practice Modes"],
        summary: "List all practice modes for pedagogical prompt studio",
        description: "Returns all practice modes with complete system prompts and rules.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const query = listPracticeModesQuerySchema.parse(request.query);
      const result = await practiceModeService.listPracticeModes(query);
      return reply.code(200).send(
        formatPaginatedResponse(request, "Admin practice modes retrieved successfully", result.items, {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        }),
      );
    },
  );

  // GET /api/v1/admin/practice-modes/:id
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Admin Practice Modes"],
        summary: "Get single practice mode details for prompt editing",
        description: "Returns full pedagogical system prompt for a single practice mode.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = practiceModeIdParamSchema.parse(request.params);
      const mode = await practiceModeService.getPracticeModeById(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "Practice mode details retrieved successfully", mode),
      );
    },
  );

  // POST /api/v1/admin/practice-modes
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Admin Practice Modes"],
        summary: "Create a new practice mode",
        description: "Superadmin endpoint to create a new pedagogical practice mode with system prompts.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const input = createPracticeModeSchema.parse(request.body);
      const created = await practiceModeService.createPracticeMode(input);
      return reply.code(201).send(
        formatSuccessResponse(request, "Practice mode created successfully", created),
      );
    },
  );

  // PATCH /api/v1/admin/practice-modes/:id
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["Admin Practice Modes"],
        summary: "Update practice mode pedagogical prompt",
        description: "Allows superadmin to update practice mode system prompts, pedagogical guidelines, and objectives.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = practiceModeIdParamSchema.parse(request.params);
      const input = updatePracticeModeSchema.parse(request.body);
      const updated = await practiceModeService.updatePracticeMode(id, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Practice mode updated successfully", updated),
      );
    },
  );

  // DELETE /api/v1/admin/practice-modes/:id
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Admin Practice Modes"],
        summary: "Soft delete / deactivate practice mode",
        description: "Superadmin endpoint to deactivate a practice mode from the platform.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = practiceModeIdParamSchema.parse(request.params);
      await practiceModeService.deletePracticeMode(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "Practice mode deleted successfully", { id, deleted: true }),
      );
    },
  );
};
