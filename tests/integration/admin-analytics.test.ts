import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "@/app.ts";

describe("Superadmin Analytics & AI Cost Engine Integration Suite", () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let orgAdminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Superadmin Token
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@tutor.com",
        password: "Admin@1234",
      },
    });
    superadminToken = adminLogin.json().data.token;

    // 2. Org Admin Token
    const orgLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "org@tutor.com",
        password: "Org@1234",
      },
    });
    orgAdminToken = orgLogin.json().data.token;

    // 3. User Token
    const userLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "test@tutor.com",
        password: "Test@1234",
      },
    });
    userToken = userLogin.json().data.token;
  });

  afterAll(async () => {
    await app.close();
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

    // 3. Org admin -> 403
    const orgRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/overview",
      headers: { authorization: `Bearer ${orgAdminToken}` },
    });
    expect(orgRes.statusCode).toBe(403);
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
    expect(json.data.users.total).toBeGreaterThanOrEqual(3);
    expect(json.data.users.breakdownByRole.superadmin).toBeGreaterThanOrEqual(1);
    expect(json.data.users.breakdownByRole.org_admin).toBeGreaterThanOrEqual(1);
    expect(json.data.users.breakdownByRole.user).toBeGreaterThanOrEqual(1);
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

    const components = json.data.breakdown.map((b: any) => b.component);
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
