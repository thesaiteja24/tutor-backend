import { describe, expect, it } from "bun:test";

import { registerSchema } from "@/modules/auth/auth.schemas.ts";
import { createConversationSchema } from "@/modules/conversations/conversation.schemas.ts";
import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";

describe("authentication and boundary validation", () => {
  it("accepts a valid registration without allowing role or organization fields", () => {
    const result = registerSchema.safeParse({
      email: "student@example.com",
      password: "Student@123",
      displayName: "Student",
      nativeLanguage: "te",
      englishLevel: "intermediate",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("role");
      expect(result.data).not.toHaveProperty("orgId");
    }
  });

  it("rejects unknown registration fields instead of silently stripping them", () => {
    const result = registerSchema.safeParse({
      email: "student@example.com",
      password: "Student@123",
      displayName: "Student",
      role: "superadmin",
    });

    expect(result.success).toBe(false);
  });

  it("rejects user-controlled ownership fields on conversation creation", () => {
    const result = createConversationSchema.safeParse({
      personaId: "01950000-0000-7000-8000-000000000001",
      practiceModeId: "01950000-0000-7000-9000-000000000001",
      userId: "01950000-0000-7000-8000-000000000002",
    });

    expect(result.success).toBe(false);
  });

  it("accepts UUIDv7 and rejects UUIDv4 identifiers", () => {
    expect(uuidv7Schema.safeParse("01950000-0000-7000-8000-000000000001").success).toBe(true);
    expect(uuidv7Schema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(false);
  });
});
