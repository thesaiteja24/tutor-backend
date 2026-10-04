import { describe, expect, it } from "bun:test";
import {
  PASSWORD_REGEX,
  generateNumericOtp,
  hashOtp,
  hashPassword,
  verifyOtp,
  verifyPassword,
} from "@/shared/auth/password.ts";
import { signJwtToken, verifyJwtToken } from "@/shared/auth/jwt.ts";

describe("Password & Auth Security Unit Tests", () => {
  it("strictly validates standard password complexity regex", () => {
    // Valid passwords
    expect(PASSWORD_REGEX.test("Password@123")).toBe(true);
    expect(PASSWORD_REGEX.test("Str0ng!Pass")).toBe(true);
    expect(PASSWORD_REGEX.test("A1b2c3d$e")).toBe(true);

    // Invalid: Too short (< 8 chars)
    expect(PASSWORD_REGEX.test("Pass@1")).toBe(false);

    // Invalid: No uppercase
    expect(PASSWORD_REGEX.test("password@123")).toBe(false);

    // Invalid: No lowercase
    expect(PASSWORD_REGEX.test("PASSWORD@123")).toBe(false);

    // Invalid: No digit
    expect(PASSWORD_REGEX.test("Password@Pass")).toBe(false);

    // Invalid: No special character
    expect(PASSWORD_REGEX.test("Password1234")).toBe(false);
  });

  it("hashes and verifies password using Bun argon2id", async () => {
    const plain = "SuperSecret@2026";
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash.startsWith("$argon2id$")).toBe(true);

    const isMatch = await verifyPassword(plain, hash);
    expect(isMatch).toBe(true);

    const wrongMatch = await verifyPassword("WrongPassword@2026", hash);
    expect(wrongMatch).toBe(false);
  });

  it("generates 6-digit numeric OTP and verifies hash", async () => {
    const otp = generateNumericOtp();
    expect(otp.length).toBe(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);

    const otpHash = await hashOtp(otp);
    const valid = await verifyOtp(otp, otpHash);
    expect(valid).toBe(true);

    const invalid = await verifyOtp("000000", otpHash);
    expect(invalid).toBe(false);
  });

  it("signs and verifies 30-day JWT payload with role and orgId claims", () => {
    const payload = {
      userId: "01950000-0000-7000-8000-000000000001",
      email: "admin@tutor.com",
      displayName: "Super Admin",
      role: "superadmin" as const,
      orgId: "01950000-0000-7000-8000-000000000099",
      nativeLanguage: "en",
      englishLevel: "advanced",
    };

    const token = signJwtToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = verifyJwtToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.displayName).toBe(payload.displayName);
    expect(decoded.role).toBe("superadmin");
    expect(decoded.orgId).toBe(payload.orgId);
  });
});
