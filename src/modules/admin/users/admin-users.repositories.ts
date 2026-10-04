import { and, asc, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { users, type User, type UserRole } from "@/database/schema/users.ts";
import type { ListAdminUsersQuery } from "./admin-users.schemas.ts";

export class AdminUsersRepository {
  async findMany(query: ListAdminUsersQuery): Promise<{ items: User[]; total: number }> {
    const conditions: (SQL | undefined)[] = [isNull(users.deletedAt)];

    if (query.q) {
      const searchPattern = `%${query.q}%`;
      conditions.push(
        or(
          ilike(users.email, searchPattern),
          ilike(users.displayName, searchPattern)
        )
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

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    const [row] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    return row || null;
  }

  async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const [row] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    return row || null;
  }
}

export const adminUsersRepository = new AdminUsersRepository();
