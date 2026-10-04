import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { FastifyInstance } from "fastify";

import { buildApp } from "@/app.ts";

describe("Practice Modes REST API Suite", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/practice-modes -> lists seeded practice modes with pagination", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/practice-modes?limit=10&offset=0",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(5);
    expect(json.meta.total).toBeGreaterThanOrEqual(5);
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
