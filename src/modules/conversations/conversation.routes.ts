import type { FastifyPluginAsync } from "fastify";
import { conversationService } from "@/modules/conversations/conversation.services.ts";
import { formatPaginatedResponse, formatSuccessResponse } from "@/shared/utils/response.ts";
import {
  createConversationSchema,
  getConversationParamsSchema,
  listConversationsQuerySchema,
  updateConversationSchema,
} from "./conversation.schemas.ts";

const conversationItemSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    userId: { type: "string", format: "uuid" },
    personaId: { type: "string", format: "uuid" },
    practiceModeId: { type: "string", format: "uuid" },
    title: { type: "string" },
    customPrompt: { type: "string", nullable: true },
    status: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    persona: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        description: { type: "string" },
        systemPrompt: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    },
    practiceMode: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        description: { type: "string" },
        systemPrompt: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    },
  },
};

const conversationDetailItemSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    ...conversationItemSchema.properties,
    messages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string", format: "uuid" },
          sender: { type: "string", enum: ["user", "assistant"] },
          content: { type: "string" },
          audioUrl: { type: "string", nullable: true },
          latencyMetrics: { type: "object", additionalProperties: true, nullable: true },
          turn: {
            type: "object",
            additionalProperties: true,
            nullable: true,
            description: "Public structured tutor turn for assistant messages including copiable templates, corrections, and options.",
          },
          createdAt: { type: "string" },
        },
      },
    },
  },
};

export const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/conversations -> List conversations
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Conversations"],
        summary: "List conversations",
        description: "Returns paginated conversations for the student with associated persona info.",
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 20 },
            offset: { type: "integer", default: 0 },
            personaId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["active", "archived", "all"], default: "active" },
          },
        },
        response: {
          200: {
            description: "Paginated list of conversations",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Conversations retrieved successfully" },
              data: {
                type: "array",
                items: conversationItemSchema,
              },
              meta: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  requestId: { type: "string" },
                  total: { type: "integer", example: 12 },
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
      const query = listConversationsQuerySchema.parse(request.query);
      const { items, total } = await conversationService.listConversations(query);

      return reply.code(200).send(
        formatPaginatedResponse(request, "Conversations retrieved successfully", items, {
          total,
          limit: query.limit,
          offset: query.offset,
        })
      );
    }
  );

  // GET /api/v1/conversations/:id -> Get conversation with full message history
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Conversations"],
        summary: "Get conversation details & messages",
        description: "Retrieves a conversation, persona configuration, and all past message dialogue history.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Conversation with message history",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Conversation retrieved successfully" },
              data: conversationDetailItemSchema,
              meta: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  requestId: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getConversationParamsSchema.parse(request.params);
      const conversation = await conversationService.getConversationWithHistory(id);

      return reply.code(200).send(
        formatSuccessResponse(request, "Conversation retrieved successfully", conversation)
      );
    }
  );

  // POST /api/v1/conversations -> Create conversation
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Conversations"],
        summary: "Create a new conversation session",
        description: "Starts a new speaking session linked to a specific tutor persona.",
        body: {
          type: "object",
          required: ["personaId"],
          properties: {
            personaId: { type: "string", format: "uuid", example: "01950000-0000-7000-8000-000000000001" },
            title: { type: "string", example: "IELTS Speaking Part 1 Practice" },
            practiceMode: { type: "string", enum: ["conversation", "vocabulary_practice", "mcq", "read_aloud"], default: "conversation" },
            customPrompt: { type: "string", example: "Focus especially on vocabulary for describing architecture." },
          },
        },
        response: {
          201: {
            description: "Conversation created successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Conversation created successfully" },
              data: conversationDetailItemSchema,
              meta: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  requestId: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input = createConversationSchema.parse(request.body);
      const created = await conversationService.createConversation(input);

      return reply.code(201).send(
        formatSuccessResponse(request, "Conversation created successfully", created)
      );
    }
  );

  // PATCH /api/v1/conversations/:id -> Update title/prompt/status
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["Conversations"],
        summary: "Update conversation",
        description: "Updates conversation title, custom prompt override, or active/archived status.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Conversation updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Conversation updated successfully" },
              data: conversationItemSchema,
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getConversationParamsSchema.parse(request.params);
      const input = updateConversationSchema.parse(request.body);
      const updated = await conversationService.updateConversation(id, input);

      return reply.code(200).send(
        formatSuccessResponse(request, "Conversation updated successfully", updated)
      );
    }
  );

  // DELETE /api/v1/conversations/:id -> Archive/Soft delete
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Conversations"],
        summary: "Delete / Archive conversation",
        description: "Soft deletes a conversation session.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "Conversation deleted successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "Conversation deleted successfully" },
              data: {
                type: "object",
                properties: { id: { type: "string", format: "uuid" } },
              },
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getConversationParamsSchema.parse(request.params);
      await conversationService.deleteConversation(id);

      return reply.code(200).send(
        formatSuccessResponse(request, "Conversation deleted successfully", { id })
      );
    }
  );
};
