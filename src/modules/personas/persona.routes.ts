import type { FastifyPluginAsync } from "fastify";
import { personaService } from "@/modules/personas/persona.services.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";
import {
  getPersonaParamsSchema,
  listPersonasQuerySchema,
} from "./persona.schemas.ts";

const personaDocSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "Maya" },
    voiceId: { type: "string", example: "priya" },
    description: { type: "string", example: "High-energy, bubbly, and modern conversation buddy who makes speaking English feel effortless and fun." },
    systemPrompt: { type: "string", example: "You are Maya, a vibrant, expressive, and fun-loving Gen-Z English tutor..." },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const personaRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/personas -> List practice modes (cards for mobile home screen)
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Personas"],
        summary: "List personas",
        description: "Returns list of tutor personas with voice IDs, avatars, and descriptions.",
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 20 },
            offset: { type: "integer", default: 0 },
          },
        },
        response: {
          200: {
            description: "Paginated list of practice modes",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Practice modes retrieved successfully" },
              data: {
                type: "array",
                items: personaDocSchema,
              },
              meta: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  requestId: { type: "string" },
                  total: { type: "integer", example: 2 },
                  limit: { type: "integer", example: 20 },
                  offset: { type: "integer", example: 0 },
                  hasMore: { type: "boolean", example: false },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = listPersonasQuerySchema.parse(request.query);
      const { items, total } = await personaService.listPersonas(query);

      return reply.code(200).send(
        formatPaginatedResponse(request, "Personas retrieved successfully", items, {
          total,
          limit: query.limit,
          offset: query.offset,
        })
      );
    }
  );

  // GET /api/v1/personas/:id -> Get single persona
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Personas"],
        summary: "Get persona by ID",
        description: "Retrieves details, avatar, and system prompt for a specific persona.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Persona details",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Persona retrieved successfully" },
              data: personaDocSchema,
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getPersonaParamsSchema.parse(request.params);
      const persona = await personaService.getPersonaById(id);

      return reply.code(200).send(
        formatSuccessResponse(request, "Persona retrieved successfully", persona)
      );
    }
  );
};
