import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { authenticateUser, requireRole } from "@/modules/auth/auth.middleware.ts";
import {
  adminCreatePersonaRouteDoc,
  adminDeletePersonaRouteDoc,
  adminGetPersonaRouteDoc,
  adminListPersonasRouteDoc,
  adminUpdatePersonaRouteDoc,
} from "@/modules/personas/persona.docs.ts";
import {
  createPersonaSchema,
  listPersonasQuerySchema,
  updatePersonaSchema,
} from "@/modules/personas/persona.schemas.ts";
import { personaService } from "@/modules/personas/persona.services.ts";
import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";

const personaIdParamSchema = z.strictObject({
  id: uuidv7Schema,
});

export const adminPersonaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticateUser);
  fastify.addHook("preHandler", requireRole("superadmin"));

  // GET /api/v1/admin/personas
  fastify.get(
    "/",
    { schema: adminListPersonasRouteDoc },
    async (request, reply) => {
      const query = listPersonasQuerySchema.parse(request.query);
      const result = await personaService.listPersonas(query);
      return reply.code(200).send(
        formatPaginatedResponse(request, "Admin personas retrieved successfully", result.items, {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        }),
      );
    },
  );

  // GET /api/v1/admin/personas/:id
  fastify.get(
    "/:id",
    { schema: adminGetPersonaRouteDoc },
    async (request, reply) => {
      const { id } = personaIdParamSchema.parse(request.params);
      const persona = await personaService.getPersonaById(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "Persona details retrieved successfully", persona),
      );
    },
  );

  // POST /api/v1/admin/personas
  fastify.post(
    "/",
    { schema: adminCreatePersonaRouteDoc },
    async (request, reply) => {
      const input = createPersonaSchema.parse(request.body);
      const created = await personaService.createPersona(input);
      return reply.code(201).send(
        formatSuccessResponse(request, "Persona created successfully", created),
      );
    },
  );

  // PATCH /api/v1/admin/personas/:id
  fastify.patch(
    "/:id",
    { schema: adminUpdatePersonaRouteDoc },
    async (request, reply) => {
      const { id } = personaIdParamSchema.parse(request.params);
      const input = updatePersonaSchema.parse(request.body);
      const updated = await personaService.updatePersona(id, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "Persona updated successfully", updated),
      );
    },
  );

  // DELETE /api/v1/admin/personas/:id
  fastify.delete(
    "/:id",
    { schema: adminDeletePersonaRouteDoc },
    async (request, reply) => {
      const { id } = personaIdParamSchema.parse(request.params);
      await personaService.deletePersona(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "Persona deleted successfully", { id, deleted: true }),
      );
    },
  );
};
