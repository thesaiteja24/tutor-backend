import { z } from "zod";

export const listAdminUsersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().trim().optional(),
  role: z.enum(["user", "superadmin", "org_admin"]).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;

export const updateAdminUserRoleSchema = z.object({
  role: z.enum(["user", "superadmin", "org_admin"], {
    message: "Role must be one of: user, superadmin, org_admin",
  }),
});

export type UpdateAdminUserRoleInput = z.infer<typeof updateAdminUserRoleSchema>;

export const updateAdminUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateAdminUserStatusInput = z.infer<typeof updateAdminUserStatusSchema>;
