import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "@/app.ts";
import { db } from "@/database/index.ts";
import { practiceModes } from "@/database/schema/practice-modes.ts";
import { eq } from "drizzle-orm";

describe("Practice Modes REST API Suite", () => {
  let app: FastifyInstance;
  let testModeId: string | undefined;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (testModeId) {
      await db.delete(practiceModes).where(eq(practiceModes.id, testModeId));
    }
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

  it("POST /api/v1/practice-modes -> creates a new practice mode", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/practice-modes",
      payload: {
        name: "IELTS Speaking Coach",
        description: "Practice IELTS speaking Part 1, 2, and 3 with real-time feedback.",
        systemPrompt: "=== PRACTICE MODE: IELTS SPEAKING ===\nYou are an official IELTS examiner.",
      },
    });

    expect(response.statusCode).toBe(201);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("IELTS Speaking Coach");
    testModeId = json.data.id;
  });

  it("GET /api/v1/practice-modes/:id -> retrieves single practice mode by UUID", async () => {
    if (!testModeId) return;
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/practice-modes/${testModeId}`,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(testModeId);
    expect(json.data.name).toBe("IELTS Speaking Coach");
  });

  it("PATCH /api/v1/practice-modes/:id -> updates practice mode", async () => {
    if (!testModeId) return;
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/practice-modes/${testModeId}`,
      payload: {
        name: "IELTS Speaking Master",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("IELTS Speaking Master");
  });

  it("DELETE /api/v1/practice-modes/:id -> soft deletes practice mode", async () => {
    if (!testModeId) return;
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/practice-modes/${testModeId}`,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/practice-modes/${testModeId}`,
    });
    expect(getResponse.statusCode).toBe(404);
  });
});
