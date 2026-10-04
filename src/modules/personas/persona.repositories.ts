import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { personas, type NewPersona, type Persona } from "@/database/schema/personas.ts";
import type { ListPersonasQuery } from "./persona.schemas.ts";

export class PersonaRepository {
  private cache = new Map<string, Persona>();
  private allCache: Persona[] | null = null;

  clearCache() {
    this.cache.clear();
    this.allCache = null;
  }

  async findMany(query: ListPersonasQuery): Promise<{ items: Persona[]; total: number }> {
    // If standard listing without offset, serve from in-memory cache if available
    if (query.offset === 0 && this.allCache && this.allCache.length >= query.limit) {
      return {
        items: this.allCache.slice(0, query.limit),
        total: this.allCache.length,
      };
    }

    const whereClause = isNull(personas.deletedAt);

    const [totalResult] = await db
      .select({ total: count() })
      .from(personas)
      .where(whereClause);

    const items = await db
      .select()
      .from(personas)
      .where(whereClause)
      .orderBy(asc(personas.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    // Warm individual entity cache
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

  async findById(id: string): Promise<Persona | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const rows = await db
      .select()
      .from(personas)
      .where(and(eq(personas.id, id), isNull(personas.deletedAt)))
      .limit(1);

    const item = rows[0] || null;
    if (item) {
      this.cache.set(item.id, item);
    }
    return item;
  }

  async create(data: NewPersona): Promise<Persona> {
    const [row] = await db.insert(personas).values(data).returning();
    this.clearCache();
    return row!;
  }

  async update(id: string, data: Partial<NewPersona>): Promise<Persona | null> {
    const [row] = await db
      .update(personas)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(personas.id, id), isNull(personas.deletedAt)))
      .returning();

    this.clearCache();
    return row || null;
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db
      .update(personas)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(personas.id, id), isNull(personas.deletedAt)))
      .returning();

    this.clearCache();
    return !!row;
  }
}

export const personaRepository = new PersonaRepository();

