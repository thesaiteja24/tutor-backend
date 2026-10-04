import type { FastifyPluginAsync } from "fastify";
import { formatSuccessResponse } from "@/shared/utils/response.ts";
import { getUserParamsSchema, updateUserSchema } from "./user.schemas.ts";
import { userService } from "./user.services.ts";

const userDocSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    displayName: { type: "string", example: "Demo Student" },
    nativeLanguage: { type: "string", example: "te" },
    englishLevel: { type: "string", example: "intermediate" },
    isActive: { type: "boolean", example: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/users/me -> Default seeded user
  fastify.get(
    "/me",
    {
      schema: {
        tags: ["Users"],
        summary: "Get current default user",
        description: "Retrieves the seeded default student profile for testing without auth.",
        response: {
          200: {
            description: "User profile retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "User profile retrieved successfully" },
              data: userDocSchema,
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
      const user = await userService.getDefaultUser();
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile retrieved successfully", user)
      );
    }
  );

  // GET /api/v1/users/me/analytics -> Aggregate user analytics
  fastify.get(
    "/me/analytics",
    {
      schema: {
        tags: ["Users"],
        summary: "Get current default user analytics & practice dashboard metrics",
        description: "Retrieves speaking time, streak, weekly progress, skill breakdown, vocabulary vault, and recent history.",
        response: {
          200: {
            description: "User analytics retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "User analytics retrieved successfully" },
              data: { type: "object", additionalProperties: true },
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
      const analytics = await userService.getUserAnalytics();
      return reply.code(200).send(
        formatSuccessResponse(request, "User analytics retrieved successfully", analytics)
      );
    }
  );

  // PATCH /api/v1/users/me -> Update default user profile (native language, english level)
  fastify.patch(
    "/me",
    {
      schema: {
        tags: ["Users"],
        summary: "Update current default user",
        description: "Updates the default student's native language, english level, or display name.",
        body: {
          type: "object",
          properties: {
            displayName: { type: "string", example: "Demo Student" },
            nativeLanguage: { type: "string", example: "te" },
            englishLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"], example: "intermediate" },
          },
        },
        response: {
          200: {
            description: "User profile updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "User profile updated successfully" },
              data: userDocSchema,
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
      const defaultUser = await userService.getDefaultUser();
      const body = updateUserSchema.parse(request.body);
      const updated = await userService.updateUser(defaultUser.id, body);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile updated successfully", updated)
      );
    }
  );

  // GET /api/v1/users/:id
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Users"],
        summary: "Get user by ID",
        description: "Retrieves a student profile by their unique identifier.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            description: "User profile retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "User profile retrieved successfully" },
              data: userDocSchema,
              meta: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  requestId: { type: "string" },
                },
              },
            },
          },
          400: {
            description: "Invalid UUID identifier",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Invalid request payload or parameters" },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: { type: "string" },
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                  additionalProperties: true,
                },
              },
              meta: { type: "object", additionalProperties: true },
            },
          },
          404: {
            description: "User not found",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "User with ID not found" },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: { type: "string" },
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                  additionalProperties: true,
                },
              },
              meta: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = getUserParamsSchema.parse(request.params);
      const user = await userService.getUserById(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile retrieved successfully", user)
      );
    }
  );

  // PATCH /api/v1/users/:id
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["Users"],
        summary: "Update user by ID",
        description: "Updates a student profile's native language, english level, or name.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            displayName: { type: "string", example: "Demo Student" },
            nativeLanguage: { type: "string", example: "te" },
            englishLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"], example: "intermediate" },
          },
        },
        response: {
          200: {
            description: "User profile updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: { type: "string", example: "User profile updated successfully" },
              data: userDocSchema,
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
      const { id } = getUserParamsSchema.parse(request.params);
      const body = updateUserSchema.parse(request.body);
      const updated = await userService.updateUser(id, body);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile updated successfully", updated)
      );
    }
  );
};
