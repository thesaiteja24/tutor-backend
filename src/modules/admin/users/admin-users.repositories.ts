import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

import { db } from "@/database/index.ts";
import { type User, type UserRole,users } from "@/database/schema/users.ts";
import { ConflictError, ForbiddenError } from "@/shared/errors/index.ts";

import type { ListAdminUsersQuery } from "./admin-users.schemas.ts";

export class AdminUsersRepository {
  async findMany(query: ListAdminUsersQuery): Promise<{ items: User[]; total: number }> {
    const conditions: (SQL | undefined)[] = [isNull(users.deletedAt)];

    if (query.q) {
      const searchPattern = `%${query.q}%`;
      conditions.push(
        or(
          ilike(users.email, searchPattern),
          ilike(users.displayName, searchPattern),
        ),
      );
    }

    if (query.role) {
      conditions.push(eq(users.role, query.role));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(users.isActive, query.isActive));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const items = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    return {
      items,
      total: Number(totalResult?.total || 0),
    };
  }

  async findById(id: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return rows[0] || null;
  }

  async updateRole(id: string, role: UserRole, actorId: string): Promise<User | null> {
    return db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);

      if (!target) return null;
      if (id === actorId && role !== "superadmin") {
        throw new ForbiddenError("A superadmin cannot demote their own account.");
      }

      if (target.role === "superadmin" && role !== "superadmin") {
        const [activeSuperadmins] = await tx
          .select({ total: count() })
          .from(users)
          .where(and(eq(users.role, "superadmin"), eq(users.isActive, true), isNull(users.deletedAt)));

        if (Number(activeSuperadmins?.total || 0) <= 1) {
          throw new ConflictError("The last active superadmin cannot be demoted.");
        }
      }

      const [row] = await tx
        .update(users)
        .set({ role, orgId: null, updatedAt: new Date() })
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .returning();

      return row || null;
    });
  }

  async updateStatus(id: string, isActive: boolean, actorId: string): Promise<User | null> {
    return db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);

      if (!target) return null;
      if (id === actorId && !isActive) {
        throw new ForbiddenError("A superadmin cannot deactivate their own account.");
      }

      if (target.role === "superadmin" && target.isActive && !isActive) {
        const [activeSuperadmins] = await tx
          .select({ total: count() })
          .from(users)
          .where(and(eq(users.role, "superadmin"), eq(users.isActive, true), isNull(users.deletedAt)));

        if (Number(activeSuperadmins?.total || 0) <= 1) {
          throw new ConflictError("The last active superadmin cannot be deactivated.");
        }
      }

      const [row] = await tx
        .update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .returning();

      return row || null;
    });
  }
}

export const adminUsersRepository = new AdminUsersRepository();
