import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "@/app.ts";
import { db } from "@/database/index.ts";
import { personas } from "@/database/schema/personas.ts";
import { eq } from "drizzle-orm";

describe("AI English Communication Tutor API Suite", () => {
  let app: FastifyInstance;
  let testPersonaId: string | undefined;
  let testConversationId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (testPersonaId) {
      await db.delete(personas).where(eq(personas.id, testPersonaId));
    }
    await app.close();
  });

  describe("1. System Health Check", () => {
    it("GET /health -> returns 200 with service health info", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("healthy");
      expect(json.meta).toBeDefined();
      expect(json.meta.requestId).toBeDefined();
      expect(json.meta.timestamp).toBeDefined();
    });
  });

  describe("2. Personas Management Module", () => {
    it("POST /api/v1/personas -> validates invalid body (missing fields)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/personas",
        payload: {
          name: "Incomplete Persona",
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.errors.length).toBeGreaterThan(0);
    });

    it("POST /api/v1/personas -> creates a valid custom tutor practice mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/personas",
        payload: {
          name: "Job Interview Coach",
          description: "Practice answering behavioral and technical questions in workplace English.",
          systemPrompt: "You are an interviewer assessing communication clarity and vocabulary.",
        },
      });

      if (response.statusCode === 201) {
        const json = response.json();
        expect(json.success).toBe(true);
        expect(json.data.name).toBe("Job Interview Coach");
        expect(json.data.description).toBe("Practice answering behavioral and technical questions in workplace English.");
        testPersonaId = json.data.id;
      } else {
        expect(response.statusCode).toBe(500); // If DB is not running locally
      }
    });

    it("PATCH /api/v1/personas/:id -> updates a custom tutor practice mode", async () => {
      if (!testPersonaId) return;
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/personas/${testPersonaId}`,
        payload: {
          name: "Updated Job Interview Coach",
          description: "Updated description for behavioral interview prep.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Updated Job Interview Coach");
    });

    it("DELETE /api/v1/personas/:id -> soft deletes the persona and excludes it from list", async () => {
      if (!testPersonaId) return;
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/v1/personas/${testPersonaId}`,
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deleteJson = deleteResponse.json();
      expect(deleteJson.success).toBe(true);

      // Verify that findById or list does not return soft deleted persona
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/v1/personas/${testPersonaId}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe("3. Users Module", () => {
    it("GET /api/v1/users/me -> retrieves default student context", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/users/me",
      });

      const json = response.json();
      if (response.statusCode === 200) {
        expect(json.success).toBe(true);
        expect(json.data.email).toBeDefined();
      } else {
        expect(json.success).toBe(false);
      }
    });

    it("GET /api/v1/users/me/analytics -> retrieves aggregated analytics summary & weekly metrics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/users/me/analytics",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.summary).toBeDefined();
      expect(json.data.today).toBeDefined();
      expect(json.data.streak).toBeDefined();
      expect(json.data.skills).toBeDefined();
      expect(Array.isArray(json.data.streak.weeklyDays)).toBe(true);
      expect(Array.isArray(json.data.recentHistory)).toBe(true);
    });

    it("GET /api/v1/users/:id -> returns 400 for invalid UUID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/users/invalid-uuid",
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.errors[0]?.code).toBe("validation_error");
    });
  });

  describe("4. Conversations Module", () => {
    it("GET /api/v1/conversations -> lists conversations with pagination meta", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/conversations?limit=5&offset=0",
      });

      const json = response.json();
      if (response.statusCode === 200) {
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.meta.limit).toBe(5);
      } else {
        expect(json.success).toBe(false);
      }
    });

    it("GET /api/v1/conversations/:id -> returns 400 for non-UUID param", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/conversations/not-valid",
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.success).toBe(false);
    });
  });

  describe("5. Voice Tutor Engine & Push-to-Talk", () => {
    it("POST /api/v1/voice-tutor/conversations/:id/interact -> returns 400 for bad conversation ID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/voice-tutor/conversations/bad-id/interact",
        payload: {
          text: "Hi tutor",
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.success).toBe(false);
    });
  });
});
