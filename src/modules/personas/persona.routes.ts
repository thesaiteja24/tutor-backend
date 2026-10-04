import type { FastifyPluginAsync } from "fastify";
import { personaService } from "@/modules/personas/persona.services.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";
import {
  createPersonaSchema,
  getPersonaParamsSchema,
  listPersonasQuerySchema,
  updatePersonaSchema,
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

  // POST /api/v1/personas -> Create custom persona
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Personas"],
        summary: "Create custom persona",
        description: "Creates a new persona with custom personality, voice, and system prompt.",
        body: {
          type: "object",
          required: ["name", "description", "systemPrompt"],
          properties: {
            name: { type: "string", example: "Emma" },
            voiceId: { type: "string", example: "priya" },
            description: { type: "string", example: "Calm, deeply patient, and nurturing coach." },
            systemPrompt: { type: "string", example: "You are Emma, a serene, deeply empathetic, and gentle English tutor." },
          },
        },
        response: {
          201: {
            description: "Persona created successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Persona created successfully" },
              data: personaDocSchema,
              meta: { type: "object" },
            },
          },
        },
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

  // PATCH /api/v1/personas/:id -> Update persona
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["Personas"],
        summary: "Update persona",
        description: "Updates an existing persona's prompt, description, voice, or name.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Persona updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Persona updated successfully" },
              data: personaDocSchema,
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getPersonaParamsSchema.parse(request.params);
      const input = updatePersonaSchema.parse(request.body);
      const updated = await personaService.updatePersona(id, input);

      return reply.code(200).send(
        formatSuccessResponse(request, "Persona updated successfully", updated)
      );
    }
  );

  // DELETE /api/v1/personas/:id -> Delete persona
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Personas"],
        summary: "Delete persona",
        description: "Soft deletes a persona.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Persona deleted successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Persona deleted successfully" },
              data: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getPersonaParamsSchema.parse(request.params);
      await personaService.deletePersona(id);

      return reply.code(200).send(
        formatSuccessResponse(request, "Persona deleted successfully", { id })
      );
    }
  );
};
