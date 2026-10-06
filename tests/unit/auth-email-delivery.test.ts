import { describe, expect, it } from "bun:test";
import { uuidv7 } from "uuidv7";

import type { AuthRepository } from "@/modules/auth/auth.repositories.ts";
import { AuthService } from "@/modules/auth/auth.services.ts";
import type { EmailService } from "@/shared/email/index.ts";
import { ServiceUnavailableError } from "@/shared/errors/index.ts";

describe("authentication email delivery", () => {
  it("fails registration and invalidates the OTP when delivery fails", async () => {
    let invalidatedOtpId: string | undefined;
    const otpId = uuidv7();
    const repo = {
      findUserByEmail: async () => null,
      createUser: async () => undefined,
      createOtp: async () => ({ id: otpId }),
      markOtpUsed: async (id: string) => {
        invalidatedOtpId = id;
      },
    } as unknown as AuthRepository;
    const email = {
      sendVerificationOtp: async () => false,
    } as unknown as EmailService;
    const service = new AuthService(repo, email);

    let error: unknown;
    try {
      await service.register({
        email: "student@example.com",
        password: "Student@123",
        displayName: "Student",
        nativeLanguage: "te",
        englishLevel: "intermediate",
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(invalidatedOtpId).toBe(otpId);
  });
});
