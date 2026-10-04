import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { practiceModes, type NewPracticeMode, type PracticeMode } from "@/database/schema/practice-modes.ts";
import type { ListPracticeModesQuery } from "./practice-mode.schemas.ts";

export class PracticeModeRepository {
  private cache = new Map<string, PracticeMode>();
  private allCache: PracticeMode[] | null = null;

  clearCache() {
    this.cache.clear();
    this.allCache = null;
  }

  async findMany(query: ListPracticeModesQuery): Promise<{ items: PracticeMode[]; total: number }> {
    if (query.offset === 0 && this.allCache && this.allCache.length >= query.limit) {
      return {
        items: this.allCache.slice(0, query.limit),
        total: this.allCache.length,
      };
    }

    const whereClause = isNull(practiceModes.deletedAt);

    const [totalResult] = await db
      .select({ total: count() })
      .from(practiceModes)
      .where(whereClause);

    const items = await db
      .select()
      .from(practiceModes)
      .where(whereClause)
      .orderBy(asc(practiceModes.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    for (const item of items) {
      this.cache.set(item.id, item);
    }
    if (query.offset === 0) {
      this.allCache = items;
    }

    return {
      items,
      total: Number(totalResult?.total || 0),
    };
  }

  async findById(id: string): Promise<PracticeMode | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const rows = await db
      .select()
      .from(practiceModes)
      .where(and(eq(practiceModes.id, id), isNull(practiceModes.deletedAt)))
      .limit(1);

    const item = rows[0] || null;
    if (item) {
      this.cache.set(item.id, item);
    }
    return item;
  }

  async create(data: NewPracticeMode): Promise<PracticeMode> {
    const [row] = await db.insert(practiceModes).values(data).returning();
    this.clearCache();
    return row!;
  }

  async update(id: string, data: Partial<NewPracticeMode>): Promise<PracticeMode | null> {
    const [row] = await db
      .update(practiceModes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(practiceModes.id, id), isNull(practiceModes.deletedAt)))
      .returning();

    this.clearCache();
    return row || null;
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db
      .update(practiceModes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(practiceModes.id, id), isNull(practiceModes.deletedAt)))
      .returning();

    this.clearCache();
    return !!row;
  }
}

export const practiceModeRepository = new PracticeModeRepository();

