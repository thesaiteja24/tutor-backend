import type { FastifyPluginAsync } from "fastify";

import { authenticateUser } from "@/modules/auth/auth.middleware.ts";
import { ForbiddenError } from "@/shared/errors/index.ts";
import { formatSuccessResponse } from "@/shared/utils/response.ts";

import {
  getMeRouteDoc,
  getMyAnalyticsRouteDoc,
  getUserByIdRouteDoc,
  updateMeRouteDoc,
  updateUserByIdRouteDoc,
} from "./user.docs.ts";
import { getUserParamsSchema, updateUserSchema } from "./user.schemas.ts";
import { userService } from "./user.services.ts";

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/users/me -> Authenticated user
  fastify.get(
    "/me",
    {
      preHandler: [authenticateUser],
      schema: getMeRouteDoc,
    },
    async (request, reply) => {
      const user = await userService.getUserById(request.user!.userId);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile retrieved successfully", user),
      );
    },
  );

  // GET /api/v1/users/me/analytics -> Aggregate user analytics
  fastify.get(
    "/me/analytics",
    {
      preHandler: [authenticateUser],
      schema: getMyAnalyticsRouteDoc,
    },
    async (request, reply) => {
      const analytics = await userService.getUserAnalytics(request.user!.userId);
      return reply.code(200).send(
        formatSuccessResponse(request, "User analytics retrieved successfully", analytics),
      );
    },
  );

  // PATCH /api/v1/users/me -> Update authenticated user profile
  fastify.patch(
    "/me",
    {
      preHandler: [authenticateUser],
      schema: updateMeRouteDoc,
    },
    async (request, reply) => {
      const body = updateUserSchema.parse(request.body);
      const updated = await userService.updateUser(request.user!.userId, body);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile updated successfully", updated),
      );
    },
  );

  // GET /api/v1/users/:id -> Get user by ID
  fastify.get(
    "/:id",
    {
      preHandler: [authenticateUser],
      schema: getUserByIdRouteDoc,
    },
    async (request, reply) => {
      const { id } = getUserParamsSchema.parse(request.params);
      if (id !== request.user!.userId && request.user!.role !== "superadmin") {
        throw new ForbiddenError("You may only access your own user profile.");
      }
      const user = await userService.getUserById(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile retrieved successfully", user),
      );
    },
  );

  // PATCH /api/v1/users/:id -> Update user by ID
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticateUser],
      schema: updateUserByIdRouteDoc,
    },
    async (request, reply) => {
      const { id } = getUserParamsSchema.parse(request.params);
      if (id !== request.user!.userId && request.user!.role !== "superadmin") {
        throw new ForbiddenError("You may only update your own user profile.");
      }
      const body = updateUserSchema.parse(request.body);
      const updated = await userService.updateUser(id, body);
      return reply.code(200).send(
        formatSuccessResponse(request, "User profile updated successfully", updated),
      );
    },
  );
};
