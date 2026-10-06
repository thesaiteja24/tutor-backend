import { NotFoundError } from "@/shared/errors/index.ts";

import {
  type AdminUsersRepository,
  adminUsersRepository,
} from "./admin-users.repositories.ts";
import type {
  ListAdminUsersQuery,
  UpdateAdminUserRoleInput,
  UpdateAdminUserStatusInput,
} from "./admin-users.schemas.ts";

export class AdminUsersService {
  constructor(private readonly repo: AdminUsersRepository = adminUsersRepository) {}

  private sanitizeUser(user: { id: string; email: string; displayName: string; role: "superadmin" | "org_admin" | "user"; orgId?: string | null; nativeLanguage: string; englishLevel: string; isEmailVerified: boolean; authProvider: string; isActive: boolean; lastLoginAt?: string | Date | null; createdAt: string | Date; updatedAt: string | Date }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      orgId: user.orgId || null,
      nativeLanguage: user.nativeLanguage,
      englishLevel: user.englishLevel,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };
  }

  async listUsers(query: ListAdminUsersQuery) {
    const { items, total } = await this.repo.findMany(query);
    return {
      items: items.map((u) => this.sanitizeUser(u)),
      total,
    };
  }

  async getUserById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }
    return this.sanitizeUser(user);
  }

  async updateUserRole(id: string, input: UpdateAdminUserRoleInput, actorId: string) {
    const updated = await this.repo.updateRole(id, input.role, actorId);
    if (!updated) {
      throw new NotFoundError("User account not found.");
    }
    return this.sanitizeUser(updated);
  }

  async updateUserStatus(id: string, input: UpdateAdminUserStatusInput, actorId: string) {
    const updated = await this.repo.updateStatus(id, input.isActive, actorId);
    if (!updated) {
      throw new NotFoundError("User account not found.");
    }
    return this.sanitizeUser(updated);
  }
}

export const adminUsersService = new AdminUsersService();
