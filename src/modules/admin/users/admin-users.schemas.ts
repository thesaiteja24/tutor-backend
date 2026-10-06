import { z } from "zod";

export const listAdminUsersQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(255).optional(),
  role: z.enum(["user", "superadmin", "org_admin"]).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;

export const updateAdminUserRoleSchema = z.strictObject({
  role: z.enum(["user", "superadmin"], {
    message: "Role must be one of: user or superadmin. Organization-admin promotion requires an approved organization request.",
  }),
});

export type UpdateAdminUserRoleInput = z.infer<typeof updateAdminUserRoleSchema>;

export const updateAdminUserStatusSchema = z.strictObject({
  isActive: z.boolean(),
});

export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusSchema>;
