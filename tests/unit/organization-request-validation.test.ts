import { describe, expect, it } from "bun:test";

import {
  createOrganizationRequestSchema,
  rejectOrganizationRequestSchema,
} from "@/modules/organization-requests/organization-request.schemas.ts";

describe("organization request validation", () => {
  it("accepts a valid request", () => {
    expect(createOrganizationRequestSchema.safeParse({
      organizationName: "Codegnan Learning Center",
      organizationDescription: "A language learning organization.",
    }).success).toBe(true);
  });

  it("rejects unknown fields and empty names", () => {
    expect(createOrganizationRequestSchema.safeParse({ organizationName: "", role: "org_admin" }).success).toBe(false);
  });

  it("requires a meaningful rejection reason", () => {
    expect(rejectOrganizationRequestSchema.safeParse({ reason: "no" }).success).toBe(false);
    expect(rejectOrganizationRequestSchema.safeParse({ reason: "The organization details need clarification." }).success).toBe(true);
  });
});
