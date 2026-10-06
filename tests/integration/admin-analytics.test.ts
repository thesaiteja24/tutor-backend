import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";

import { buildApp } from "@/app.ts";
import { env } from "@/config/index.ts";
import { db } from "@/database/index.ts";
import { users } from "@/database/schema/index.ts";
import { signJwtToken } from "@/shared/auth/jwt.ts";

describe("Superadmin Analytics & AI Cost Engine Integration Suite", () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let userToken: string;
  let validationUserId: string;
  const validationUserEmail = `validation-user.${Date.now()}@tutor.app`;

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

    const [validationUser] = await db.insert(users).values({
      id: uuidv7(),
      email: validationUserEmail,
      displayName: "Validation User",
      role: "user",
      nativeLanguage: "te",
      englishLevel: "intermediate",
      isEmailVerified: true,
      authProvider: "local",
      isActive: true,
    }).returning();
    validationUserId = validationUser!.id;

    userToken = signJwtToken({
      userId: validationUserId,
      email: validationUserEmail,
      displayName: "Validation User",
      role: "user",
      orgId: null,
      nativeLanguage: "te",
      englishLevel: "intermediate",
    });
  });

  afterAll(async () => {
    if (validationUserId) {
      await db.delete(users).where(eq(users.id, validationUserId));
    }
    await app?.close();
  });

  it("GET /api/v1/admin/analytics/overview -> enforces 401 without auth and 403 for non-superadmin", async () => {
    // 1. No auth -> 401
    const noAuthRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/overview",
    });
    expect(noAuthRes.statusCode).toBe(401);

    // 2. Regular user -> 403
    const userRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/overview",
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(userRes.statusCode).toBe(403);

  });

  it("GET /api/v1/admin/analytics/overview -> returns platform KPIs and cost summary for superadmin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/overview",
      headers: { authorization: `Bearer ${superadminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.users).toBeDefined();
    expect(json.data.users.total).toBeGreaterThanOrEqual(1);
    expect(json.data.users.breakdownByRole.superadmin).toBeGreaterThanOrEqual(1);
    expect(json.data.usage).toBeDefined();
    expect(json.data.costs).toBeDefined();
    expect(json.data.costs.currency).toBe("INR");
    expect(json.data.telemetry).toBeDefined();
  });

  it("GET /api/v1/admin/analytics/costs -> returns detailed AI cost calculation breakdown", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/costs",
      headers: { authorization: `Bearer ${superadminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.currency).toBe("INR");
    expect(json.data.totals).toBeDefined();
    expect(Array.isArray(json.data.breakdown)).toBe(true);
    expect(json.data.breakdown.length).toBe(3); // STT, TTS, LLM

    const components = (json.data.breakdown as Array<{ component: string }>).map((b) => b.component);
    expect(components).toContain("Speech-to-Text (STT)");
    expect(components).toContain("Text-to-Speech (TTS)");
    expect(components).toContain("LLM Reasoning & Turn Synthesis");
  });

  it("GET /api/v1/admin/analytics/latency -> returns latency distribution percentiles", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/latency",
      headers: { authorization: `Bearer ${superadminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.summary).toBeDefined();
    expect(json.data.stages).toBeDefined();
    expect(json.data.stages.stt).toBeDefined();
    expect(json.data.stages.llm).toBeDefined();
    expect(json.data.stages.tts).toBeDefined();
    expect(json.data.stages.endToEnd).toBeDefined();
  });
});
