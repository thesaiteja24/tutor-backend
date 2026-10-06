import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";

import { buildApp } from "@/app.ts";
import { db } from "@/database/index.ts";
import { practiceModes } from "@/database/schema/index.ts";

describe("Practice Modes REST API Suite", () => {
  let app: FastifyInstance;
  let fixtureId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const [fixture] = await db.insert(practiceModes).values({
      id: uuidv7(),
      name: `Integration Practice Mode ${Date.now()}`,
      description: "Temporary integration fixture.",
      systemPrompt: "Use one question at a time and provide concise feedback.",
    }).returning();
    fixtureId = fixture!.id;
  });

  afterAll(async () => {
    if (fixtureId) await db.delete(practiceModes).where(eq(practiceModes.id, fixtureId));
    await app.close();
  });

  it("GET /api/v1/practice-modes -> lists available practice modes with pagination", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/practice-modes?limit=10&offset=0",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.meta.total).toBeGreaterThanOrEqual(1);
    expect(json.data[0].id).toBeDefined();
    expect(json.data[0].name).toBeDefined();
    expect(json.data[0].systemPrompt).toBeDefined();
  });

  it("GET /api/v1/practice-modes/:id -> retrieves single practice mode by UUID", async () => {
    // Fetch first seeded mode
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/practice-modes?limit=1",
    });
    const firstMode = listRes.json().data[0];
    expect(firstMode).toBeDefined();

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/practice-modes/${firstMode.id}`,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(firstMode.id);
    expect(json.data.name).toBe(firstMode.name);
  });

  it("POST /api/v1/practice-modes -> blocked on public routes (404/405)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/practice-modes",
      payload: {
        name: "Unauthorized Practice Mode",
        description: "Test",
        systemPrompt: "Test",
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
