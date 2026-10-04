import type { FastifyPluginAsync } from "fastify";
import { formatSuccessResponse, formatPaginatedResponse } from "@/shared/utils/response.ts";
import { authenticateUser, requireRole } from "@/modules/auth/auth.middleware.ts";
import { adminUsersService } from "./admin-users.services.ts";
import {
  listAdminUsersQuerySchema,
  updateAdminUserRoleSchema,
  updateAdminUserStatusSchema,
} from "./admin-users.schemas.ts";
import { z } from "zod";

const userIdParamSchema = z.object({
  id: z.string().uuid("User ID must be a valid UUID"),
});

export const adminUserRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticateUser);
  fastify.addHook("preHandler", requireRole("superadmin"));

  // GET /api/v1/admin/users
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Admin Users"],
        summary: "Search and list all platform users",
        description: "Returns paginated list of users with query search (by name/email) and role filters.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const query = listAdminUsersQuerySchema.parse(request.query);
      const result = await adminUsersService.listUsers(query);
      return reply.code(200).send(
        formatPaginatedResponse(request, "Platform users retrieved successfully", result.items, {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        })
      );
    }
  );

  // GET /api/v1/admin/users/:id
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Admin Users"],
        summary: "Get single user account profile",
        description: "Returns user metadata, role, status, and verification state.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = userIdParamSchema.parse(request.params);
      const user = await adminUsersService.getUserById(id);
      return reply.code(200).send(
        formatSuccessResponse(request, "User account retrieved successfully", user)
      );
    }
  );

  // PATCH /api/v1/admin/users/:id/role
  fastify.patch(
    "/:id/role",
    {
      schema: {
        tags: ["Admin Users"],
        summary: "Promote or change user role",
        description: "Allows superadmin to assign user, superadmin, or org_admin role to any account.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = userIdParamSchema.parse(request.params);
      const input = updateAdminUserRoleSchema.parse(request.body);
      const updated = await adminUsersService.updateUserRole(id, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "User role updated successfully", updated)
      );
    }
  );

  // PATCH /api/v1/admin/users/:id/status
  fastify.patch(
    "/:id/status",
    {
      schema: {
        tags: ["Admin Users"],
        summary: "Toggle user active / suspended status",
        description: "Allows superadmin to activate or suspend any platform user account.",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = userIdParamSchema.parse(request.params);
      const input = updateAdminUserStatusSchema.parse(request.body);
      const updated = await adminUsersService.updateUserStatus(id, input);
      return reply.code(200).send(
        formatSuccessResponse(request, "User status updated successfully", updated)
      );
    }
  );
};
