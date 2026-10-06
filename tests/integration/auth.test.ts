import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { buildApp } from "@/app.ts";
import { env } from "@/config/index.ts";
import { db } from "@/database/index.ts";
import { authOtps, users } from "@/database/schema/index.ts";
import { hashOtp } from "@/shared/auth/password.ts";

describe("Authentication & Email Verification Integration Suite", () => {
  let app: FastifyInstance;
  const testEmail = `test.student.${Date.now()}@tutor.app`;
  const roleAttackEmail = `role-attack.${Date.now()}@tutor.app`;
  const testPassword = "Password@123";
  let authToken: string;
  let pendingNewTestEmail: string | undefined;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup test user & otps
    await db.delete(authOtps).where(eq(authOtps.email, testEmail));
    await db.delete(users).where(eq(users.email, testEmail));
    await db.delete(authOtps).where(eq(authOtps.email, roleAttackEmail));
    await db.delete(users).where(eq(users.email, roleAttackEmail));
    if (pendingNewTestEmail) {
      await db.delete(authOtps).where(eq(authOtps.email, pendingNewTestEmail));
      await db.delete(users).where(eq(users.email, pendingNewTestEmail));
    }
    await app?.close();
  });

  it("POST /api/v1/auth/register -> rejects weak passwords", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: "weak",
        displayName: "Test User",
      },
    });

    expect(response.statusCode).toBe(400);
    const json = response.json();
    expect(json.success).toBe(false);
  });

  it("POST /api/v1/auth/register -> rejects client-supplied elevated role fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: roleAttackEmail,
        password: testPassword,
        displayName: "Role Attack",
        role: "superadmin",
        orgId: "01950000-0000-7000-8000-000000000001",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it("POST /api/v1/auth/register -> registers unverified user and creates 6-digit OTP", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: testPassword,
        displayName: "Test User",
        nativeLanguage: "te",
        englishLevel: "intermediate",
      },
    });

    expect(response.statusCode).toBe(201);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testEmail);

    // Verify in DB
    const [user] = await db.select().from(users).where(eq(users.email, testEmail));
    expect(user).toBeDefined();
    expect(user!.isEmailVerified).toBe(false);

    const [otp] = await db.select().from(authOtps).where(eq(authOtps.email, testEmail));
    expect(otp).toBeDefined();
    expect(otp!.purpose).toBe("email_verification");
    expect(otp!.isUsed).toBe(false);
  }, 30000);

  it("POST /api/v1/auth/login -> blocks unverified user with 403", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(403);
    const json = response.json();
    expect(json.success).toBe(false);
  }, 30000);

  it("POST /api/v1/auth/verify-email -> verifies user and returns 30-day JWT", async () => {
    // Inject a known OTP for test determinism
    const testOtp = "654321";
    const otpHash = await hashOtp(testOtp);
    await db
      .update(authOtps)
      .set({ otpHash, expiresAt: new Date(Date.now() + 600000) })
      .where(and(eq(authOtps.email, testEmail), eq(authOtps.purpose, "email_verification")));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: {
        email: testEmail,
        otp: testOtp,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.user.isEmailVerified).toBe(true);
    expect(json.data.token).toBeDefined();

    authToken = json.data.token;

    // Verify in DB
    const [user] = await db.select().from(users).where(eq(users.email, testEmail));
    expect(user!.isEmailVerified).toBe(true);
  });

  it("POST /api/v1/auth/login -> authenticates verified user with correct credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    expect(json.data.user.email).toBe(testEmail);
  });

  it("GET /api/v1/auth/me -> retrieves profile using Bearer JWT", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testEmail);
    expect(json.data.displayName).toBe("Test User");
  });

  it("POST /api/v1/auth/change-password -> updates password for authenticated user", async () => {
    const newPassword = "UpdatedPassword@456";
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/change-password",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        currentPassword: testPassword,
        newPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);

    // Verify login with new password works
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: newPassword,
      },
    });
    expect(loginRes.statusCode).toBe(200);
  });

  it("POST /api/v1/auth/forgot-password & reset-password -> handles password reset flow", async () => {
    // 1. Request reset
    const forgotRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: {
        email: testEmail,
      },
    });
    expect(forgotRes.statusCode).toBe(200);

    // 2. Mock known reset OTP
    const resetOtp = "112233";
    const otpHash = await hashOtp(resetOtp);
    await db
      .update(authOtps)
      .set({ otpHash, expiresAt: new Date(Date.now() + 600000) })
      .where(and(eq(authOtps.email, testEmail), eq(authOtps.purpose, "password_reset")));

    // 3. Reset password
    const finalPassword = "FinalResetPassword@789";
    const resetRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: {
        email: testEmail,
        otp: resetOtp,
        newPassword: finalPassword,
      },
    });

    expect(resetRes.statusCode).toBe(200);

    // 4. Verify login with final reset password
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: finalPassword,
      },
    });
    expect(loginRes.statusCode).toBe(200);
  }, 30000);

  it(
    "POST /api/v1/auth/change-email/request & confirm -> handles complete email change flow",
    async () => {
      // 1. Re-login with current active password to get fresh token
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "FinalResetPassword@789",
        },
      });
      const currentToken = loginRes.json().data.token;

      const newTestEmail = `new-email-${Date.now()}@example.com`;
      pendingNewTestEmail = newTestEmail;

      // 2. Request change email (fails with wrong password)
      const wrongPassRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/change-email/request",
        headers: { authorization: `Bearer ${currentToken}` },
        payload: {
          currentPassword: "WrongPassword@123",
          newEmail: newTestEmail,
        },
      });
      expect(wrongPassRes.statusCode).toBe(400);

      // 3. Request change email (succeeds)
      const requestRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/change-email/request",
        headers: { authorization: `Bearer ${currentToken}` },
        payload: {
          currentPassword: "FinalResetPassword@789",
          newEmail: newTestEmail,
        },
      });
      expect(requestRes.statusCode).toBe(200);
      expect(requestRes.json().success).toBe(true);

      // 4. Mock known email change OTP
      const changeOtp = "654321";
      const otpHash = await hashOtp(changeOtp);
      await db
        .update(authOtps)
        .set({ otpHash, expiresAt: new Date(Date.now() + 600000) })
        .where(and(eq(authOtps.email, newTestEmail), eq(authOtps.purpose, "email_change")));

      // 5. Confirm email change
      const confirmRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/change-email/confirm",
        headers: { authorization: `Bearer ${currentToken}` },
        payload: {
          newEmail: newTestEmail,
          otp: changeOtp,
        },
      });
      expect(confirmRes.statusCode).toBe(200);
      const confirmJson = confirmRes.json();
      expect(confirmJson.success).toBe(true);
      expect(confirmJson.data.user.email).toBe(newTestEmail);
      expect(confirmJson.data.token).toBeDefined();

      // 6. Verify profile with new token
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${confirmJson.data.token}` },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json().data.email).toBe(newTestEmail);

      // Cleanup
      await db.delete(users).where(eq(users.email, newTestEmail));
      await db.delete(authOtps).where(eq(authOtps.email, newTestEmail));
      pendingNewTestEmail = undefined;
    }, 30000);

  it(
    "POST /api/v1/auth/login -> authenticates the configured seeded superadmin",
    async () => {
      if (!env.ADMIN_EMAIL || !env.ADMIN_PASS) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASS are required for the seeded admin integration test");
      }

      const adminRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: env.ADMIN_EMAIL,
          password: env.ADMIN_PASS,
        },
      });
      expect(adminRes.statusCode).toBe(200);
      const adminJson = adminRes.json();
      expect(adminJson.data.user.role).toBe("superadmin");
    }, 15000);
});
