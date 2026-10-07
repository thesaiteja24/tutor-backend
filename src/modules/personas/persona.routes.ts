import type { FastifyPluginAsync } from "fastify";

import { personaService } from "@/modules/personas/persona.services.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";

import { getPersonaRouteDoc, listPersonasRouteDoc } from "./persona.docs.ts";
import {
  getPersonaParamsSchema,
  listPersonasQuerySchema,
} from "./persona.schemas.ts";

export const personaRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/personas -> List all active tutor personas
  fastify.get(
    "/",
    { schema: listPersonasRouteDoc },
    async (request, reply) => {
      const query = listPersonasQuerySchema.parse(request.query);
      const { items, total } = await personaService.listPersonas(query);

      return reply.code(200).send(
        formatPaginatedResponse(request, "Personas retrieved successfully", items, {
          total,
          limit: query.limit,
          offset: query.offset,
        }),
      );
    },
  );

  // GET /api/v1/personas/:id -> Get single tutor persona
  fastify.get(
    "/:id",
    { schema: getPersonaRouteDoc },
    async (request, reply) => {
      const { id } = getPersonaParamsSchema.parse(request.params);
      const persona = await personaService.getPersonaById(id);

      return reply.code(200).send(
        formatSuccessResponse(request, "Persona retrieved successfully", persona),
      );
    },
  );
};
