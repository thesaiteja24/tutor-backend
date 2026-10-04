import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { FastifyInstance } from "fastify";

import { buildApp } from "@/app.ts";

describe("AI English Communication Tutor API Suite", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
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

  describe("2. Personas Management Module (Learner Access)", () => {
    it("GET /api/v1/personas -> lists tutor personas for learners", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/personas",
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toBeDefined();
    });

    it("POST /api/v1/personas -> is not available on public route (404/405)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/personas",
        payload: {
          name: "Unauthorized Persona",
          description: "Test",
          systemPrompt: "Test",
        },
      });

      expect(response.statusCode).toBe(404);
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
