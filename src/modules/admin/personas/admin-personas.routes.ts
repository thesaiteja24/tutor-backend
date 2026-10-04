import type { FastifyPluginAsync } from "fastify";
import { formatSuccessResponse, formatPaginatedResponse } from "@/shared/utils/response.ts";
import { authenticateUser, requireRole } from "@/modules/auth/auth.middleware.ts";
import { personaService } from "@/modules/personas/persona.services.ts";
import {
  createPersonaSchema,
  listPersonasQuerySchema,
  updatePersonaSchema,
} from "@/modules/personas/persona.schemas.ts";
import { z } from "zod";

const personaIdParamSchema = z.object({
  id: z.string().uuid("Persona ID must be a valid UUID"),
});

export const adminPersonaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticateUser);
  fastify.addHook("preHandler", requireRole("superadmin"));

  // GET /api/v1/admin/personas
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Admin Personas"],
        summary: "List all tutor personas for prompt studio",
        description: "Returns all tutor personas with system prompts, voice configurations, and preview audios.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const query = listPersonasQuerySchema.parse(request.query);
      const result = await personaService.listPersonas(query);
      return reply.code(200).send(
        formatPaginatedResponse(request, "Admin personas retrieved successfully", result.items, {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        })
      );
    }
  );

  // GET /api/v1/admin/personas/:id
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Admin Personas"],
        summary: "Get single persona details for prompt editing",
        description: "Returns full system prompt and voice model configuration for a single persona.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = personaIdParamSchema.parse(request.params);
      const persona = await personaService.getPersonaById(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "Persona details retrieved successfully", persona)
      );
    }
  );

  // POST /api/v1/admin/personas
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Admin Personas"],
        summary: "Create a new tutor persona",
        description: "Superadmin endpoint to create a new AI tutor with backstory, system prompt, and Sarvam voice ID.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const input = createPersonaSchema.parse(request.body);
      const created = await personaService.createPersona(input);
      return reply.code(201).send(
        formatSuccessResponse(request, "Persona created successfully", created)
      );
    }
  );

  // PATCH /api/v1/admin/personas/:id
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["Admin Personas"],
        summary: "Update persona prompt or voice model",
        description: "Allows superadmin to update persona system prompts, voice configs, avatar URL, or preview audios.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = personaIdParamSchema.parse(request.params);
      const input = updatePersonaSchema.parse(request.body);
      const updated = await personaService.updatePersona(id, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Persona updated successfully", updated)
      );
    }
  );

  // DELETE /api/v1/admin/personas/:id
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Admin Personas"],
        summary: "Soft delete / deactivate tutor persona",
        description: "Superadmin endpoint to deactivate a tutor persona from the platform.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = personaIdParamSchema.parse(request.params);
      await personaService.deletePersona(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "Persona deleted successfully", { id, deleted: true })
      );
    }
  );
};
