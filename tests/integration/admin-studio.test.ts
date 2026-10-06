import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";

import { buildApp } from "@/app.ts";
import { env } from "@/config/index.ts";
import { db } from "@/database/index.ts";
import { personas, practiceModes, users } from "@/database/schema/index.ts";
import { signJwtToken } from "@/shared/auth/jwt.ts";

describe("Superadmin Studio & User Management Integration Suite", () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let userToken: string;
  let createdPersonaId: string;
  let createdPracticeModeId: string;
  let targetUserId: string;
  const targetUserEmail = `admin-test-user.${Date.now()}@tutor.app`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Superadmin Token
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASS,
      },
    });
    superadminToken = adminLogin.json().data.token;

    const [targetUser] = await db.insert(users).values({
      id: uuidv7(),
      email: targetUserEmail,
      displayName: "Admin Test User",
      role: "user",
      nativeLanguage: "te",
      englishLevel: "intermediate",
      isEmailVerified: true,
      authProvider: "local",
      isActive: true,
    }).returning();
    targetUserId = targetUser!.id;
    userToken = signJwtToken({
      userId: targetUserId,
      email: targetUserEmail,
      displayName: "Admin Test User",
      role: "user",
      orgId: null,
      nativeLanguage: "te",
      englishLevel: "intermediate",
    });
  });

  afterAll(async () => {
    if (createdPersonaId) {
      await db.delete(personas).where(eq(personas.id, createdPersonaId));
    }
    if (createdPracticeModeId) {
      await db.delete(practiceModes).where(eq(practiceModes.id, createdPracticeModeId));
    }
    if (targetUserId) {
      await db.delete(users).where(eq(users.id, targetUserId));
    }
    await app?.close();
  });

  // --- 1. Personas Prompt Studio ---
  describe("Superadmin Personas Prompt Studio", () => {
    it("POST /api/v1/admin/personas -> blocks non-superadmin with 403", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/personas",
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          name: "Test Tutor",
          description: "A test persona",
          systemPrompt: "You are an AI tutor.",
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it("POST /api/v1/admin/personas -> creates new persona with system prompt and voice model", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/personas",
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: {
          name: "Dr. Arvind (IELTS Expert)",
          description: "Specialized in academic vocabulary and fluency coaching.",
          systemPrompt: "You are Dr. Arvind, an experienced IELTS examiner from Oxford.",
          voiceId: "bulbul:v3:en-in-arvind",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Dr. Arvind (IELTS Expert)");
      expect(json.data.voiceId).toBe("bulbul:v3:en-in-arvind");
      createdPersonaId = json.data.id;
    });

    it("GET /api/v1/admin/personas -> lists personas for prompt studio", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/personas",
        headers: { authorization: `Bearer ${superadminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it("PATCH /api/v1/admin/personas/:id -> updates persona system prompt & description", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/personas/${createdPersonaId}`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: {
          description: "Updated specialized IELTS academic tutor.",
          systemPrompt: "You are Dr. Arvind with enhanced vocabulary recast rules.",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.description).toBe("Updated specialized IELTS academic tutor.");
    });

    it("DELETE /api/v1/admin/personas/:id -> soft deletes persona", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/admin/personas/${createdPersonaId}`,
        headers: { authorization: `Bearer ${superadminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });
  });

  // --- 2. Practice Modes Prompt Studio ---
  describe("Superadmin Practice Modes Prompt Studio", () => {
    it("POST /api/v1/admin/practice-modes -> creates new practice mode", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/admin/practice-modes",
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: {
          name: "Job Interview Drill",
          description: "Intense mock interview preparation with structured feedback.",
          systemPrompt: "Conduct a realistic technical interview. Ask one sharp question at a time.",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Job Interview Drill");
      createdPracticeModeId = json.data.id;
    });

    it("GET /api/v1/admin/practice-modes -> lists practice modes for prompt studio", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/practice-modes",
        headers: { authorization: `Bearer ${superadminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it("PATCH /api/v1/admin/practice-modes/:id -> updates practice mode prompt", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/practice-modes/${createdPracticeModeId}`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: {
          systemPrompt: "Conduct a high-stakes executive job interview with dynamic follow-ups.",
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.systemPrompt).toContain("high-stakes executive job interview");
    });

    it("DELETE /api/v1/admin/practice-modes/:id -> soft deletes practice mode", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/admin/practice-modes/${createdPracticeModeId}`,
        headers: { authorization: `Bearer ${superadminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });
  });

  // --- 3. User Directory & Role Assignment ---
  describe("Superadmin User Directory & Role Assignment", () => {
    it("GET /api/v1/admin/users -> searches users with pagination and role filter", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/admin/users?q=Admin%20Test%20User&role=user",
        headers: { authorization: `Bearer ${superadminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].email).toBe(targetUserEmail);
    });

    it("GET /api/v1/admin/users/:id -> retrieves user profile details", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/admin/users/${targetUserId}`,
        headers: { authorization: `Bearer ${superadminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(targetUserId);
      expect(json.data.email).toBe(targetUserEmail);
    });

    it("PATCH /api/v1/admin/users/:id/role -> updates user role", async () => {
      // Direct org_admin promotion is intentionally unavailable until the
      // organization approval workflow is implemented.
      const blockedOrgAdminRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${targetUserId}/role`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: { role: "org_admin" },
      });
      expect(blockedOrgAdminRes.statusCode).toBe(400);

      // 1. Promote to superadmin
      const promoteRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${targetUserId}/role`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: { role: "superadmin" },
      });
      expect(promoteRes.statusCode).toBe(200);
      expect(promoteRes.json().data.role).toBe("superadmin");

      // 2. Revert back to user
      const revertRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${targetUserId}/role`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: { role: "user" },
      });
      expect(revertRes.statusCode).toBe(200);
      expect(revertRes.json().data.role).toBe("user");
    });

    it("PATCH /api/v1/admin/users/:id/status -> toggles user active / suspended status", async () => {
      // 1. Suspend account
      const suspendRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${targetUserId}/status`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: { isActive: false },
      });
      expect(suspendRes.statusCode).toBe(200);
      expect(suspendRes.json().data.isActive).toBe(false);

      // 2. Re-activate account
      const activateRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/admin/users/${targetUserId}/status`,
        headers: { authorization: `Bearer ${superadminToken}` },
        payload: { isActive: true },
      });
      expect(activateRes.statusCode).toBe(200);
      expect(activateRes.json().data.isActive).toBe(true);
    });
  });
});
