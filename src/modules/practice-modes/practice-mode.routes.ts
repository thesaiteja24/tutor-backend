import type { FastifyPluginAsync } from "fastify";
import { practiceModeService } from "@/modules/practice-modes/practice-mode.services.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";
import {
  getPracticeModeParamsSchema,
  listPracticeModesQuerySchema,
} from "./practice-mode.schemas.ts";

const practiceModeDocSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "AI Live Tutor" },
    description: { type: "string", example: "Open conversational 24/7 spoken tutoring with direct English modeling and quick native tips." },
    systemPrompt: { type: "string", example: "=== PRACTICE MODE: AI LIVE TUTOR ===\nYou are an encouraging, supportive AI spoken-English live tutor..." },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const practiceModeRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/practice-modes -> List practice modes
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Practice Modes"],
        summary: "List practice modes",
        description: "Returns a paginated list of all active practice modes.",
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
                items: practiceModeDocSchema,
              },
              meta: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  requestId: { type: "string" },
                  total: { type: "integer", example: 5 },
                  limit: { type: "integer", example: 20 },
                  offset: { type: "integer", example: 0 },
                  hasMore: { type: "boolean", example: false },
                },
              },
            },
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string" },
              errors: { type: "array", items: { type: "object" } },
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = listPracticeModesQuerySchema.parse(request.query);
      const { items, total } = await practiceModeService.listPracticeModes(query);

      return reply.code(200).send(
        formatPaginatedResponse(request, "Practice modes retrieved successfully", items, {
          total,
          limit: query.limit,
          offset: query.offset,
        })
      );
    }
  );

  // GET /api/v1/practice-modes/:id -> Get single practice mode
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Practice Modes"],
        summary: "Get practice mode by ID",
        description: "Retrieves details and system prompt for a specific practice mode.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Practice mode details",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Practice mode retrieved successfully" },
              data: practiceModeDocSchema,
              meta: { type: "object" },
            },
          },
          400: {
            description: "Invalid ID format",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string" },
              errors: { type: "array", items: { type: "object" } },
              meta: { type: "object" },
            },
          },
          404: {
            description: "Practice mode not found",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string" },
              errors: { type: "array", items: { type: "object" } },
              meta: { type: "object" },
            },
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string" },
              errors: { type: "array", items: { type: "object" } },
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getPracticeModeParamsSchema.parse(request.params);
      const mode = await practiceModeService.getPracticeModeById(id);

      return reply.code(200).send(
        formatSuccessResponse(request, "Practice mode retrieved successfully", mode)
      );
    }
  );
};
