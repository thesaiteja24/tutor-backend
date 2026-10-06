import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";

import { buildApp } from "@/app.ts";
import { db } from "@/database/index.ts";
import {
  organizationRequestReminders,
  organizationRequests,
  organizations,
  users,
} from "@/database/schema/index.ts";
import { organizationRequestService } from "@/modules/organization-requests/organization-request.services.ts";
import { signJwtToken } from "@/shared/auth/jwt.ts";
import { emailService } from "@/shared/email/email.adapter.ts";

describe("Organization request workflow integration", () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let userToken: string;
  let secondUserToken: string;
  let requesterId: string;
  let secondRequesterId: string;
  let reminderRequesterId: string;
  let approvedRequestId: string;
  let rejectedRequestId: string;
  let reminderRequestId: string;
  let approvedOrganizationId: string;
  const createdUserIds: string[] = [];
  const emailCalls: string[] = [];
  const originalEmailMethods = {
    submitted: emailService.sendOrganizationRequestSubmitted,
    approved: emailService.sendOrganizationRequestApproved,
    rejected: emailService.sendOrganizationRequestRejected,
    notification: emailService.sendOrganizationAdminNotification,
  };

  const tokenFor = (user: { id: string; email: string; displayName: string; role: "user" | "superadmin"; orgId?: string | null }) => signJwtToken({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    orgId: user.orgId || null,
    nativeLanguage: "te",
    englishLevel: "intermediate",
  });

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const [superadmin] = await db.select().from(users)
      .where(and(eq(users.role, "superadmin"), eq(users.isActive, true)))
      .limit(1);
    if (!superadmin) throw new Error("A staging superadmin is required for organization workflow tests.");
    superadminToken = tokenFor({ ...superadmin, role: "superadmin" });

    const createTestUser = async (label: string) => {
      const email = `organization-request-${label}-${Date.now()}-${uuidv7().slice(-8)}@example.test`;
      const [user] = await db.insert(users).values({
        id: uuidv7(), email, displayName: `Organization ${label}`, role: "user", isEmailVerified: true,
        authProvider: "local", isActive: true,
      }).returning();
      createdUserIds.push(user!.id);
      return user!;
    };

    const requester = await createTestUser("requester");
    const secondRequester = await createTestUser("reject");
    const reminderRequester = await createTestUser("reminder");
    requesterId = requester.id;
    secondRequesterId = secondRequester.id;
    reminderRequesterId = reminderRequester.id;
    userToken = tokenFor({ ...requester, role: "user" });
    secondUserToken = tokenFor({ ...secondRequester, role: "user" });

    emailService.sendOrganizationRequestSubmitted = async (...args) => { emailCalls.push(`submitted:${args[0]}`); return true; };
    emailService.sendOrganizationRequestApproved = async (...args) => { emailCalls.push(`approved:${args[0]}`); return true; };
    emailService.sendOrganizationRequestRejected = async (...args) => { emailCalls.push(`rejected:${args[0]}`); return true; };
    emailService.sendOrganizationAdminNotification = async (...args) => { emailCalls.push(`admin:${args[0]}`); return true; };
  });

  afterAll(async () => {
    emailService.sendOrganizationRequestSubmitted = originalEmailMethods.submitted;
    emailService.sendOrganizationRequestApproved = originalEmailMethods.approved;
    emailService.sendOrganizationRequestRejected = originalEmailMethods.rejected;
    emailService.sendOrganizationAdminNotification = originalEmailMethods.notification;

    const requestIds = [approvedRequestId, rejectedRequestId, reminderRequestId].filter(Boolean);
    if (requestIds.length > 0) await db.delete(organizationRequestReminders).where(inArray(organizationRequestReminders.requestId, requestIds));
    if (requestIds.length > 0) await db.delete(organizationRequests).where(inArray(organizationRequests.id, requestIds));
    if (approvedOrganizationId) await db.delete(organizations).where(eq(organizations.id, approvedOrganizationId));
    if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
    await app?.close();
  });

  it("submits requests, blocks duplicates, and restricts review to superadmins", async () => {
    const submit = await app.inject({
      method: "POST", url: "/api/v1/organization-requests", headers: { authorization: `Bearer ${userToken}` },
      payload: { organizationName: "Staging Language Center", organizationDescription: "Workflow test organization" },
    });
    expect(submit.statusCode).toBe(201);
    approvedRequestId = submit.json().data.id;

    const duplicate = await app.inject({
      method: "POST", url: "/api/v1/organization-requests", headers: { authorization: `Bearer ${userToken}` },
      payload: { organizationName: "Duplicate Center" },
    });
    expect(duplicate.statusCode).toBe(409);

    const nonAdminReview = await app.inject({
      method: "POST", url: `/api/v1/admin/organization-requests/${approvedRequestId}/approve`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(nonAdminReview.statusCode).toBe(403);
    expect(emailCalls.some((call) => call.startsWith("submitted:"))).toBe(true);
  });

  it("approves atomically and promotes only the requester", async () => {
    const approval = await app.inject({
      method: "POST", url: `/api/v1/admin/organization-requests/${approvedRequestId}/approve`,
      headers: { authorization: `Bearer ${superadminToken}` },
    });
    expect(approval.statusCode).toBe(200);
    approvedOrganizationId = approval.json().data.organization.id;

    const [updatedUser] = await db.select().from(users).where(eq(users.id, requesterId));
    const [updatedRequest] = await db.select().from(organizationRequests).where(eq(organizationRequests.id, approvedRequestId));
    expect(updatedUser?.role).toBe("org_admin");
    expect(updatedUser?.orgId).toBe(approvedOrganizationId);
    expect(updatedRequest?.status).toBe("approved");
    expect(emailCalls.some((call) => call.startsWith("approved:"))).toBe(true);
  });

  it("rejects a request without promoting the requester", async () => {
    const submit = await app.inject({
      method: "POST", url: "/api/v1/organization-requests", headers: { authorization: `Bearer ${secondUserToken}` },
      payload: { organizationName: "Rejected Center" },
    });
    expect(submit.statusCode).toBe(201);
    rejectedRequestId = submit.json().data.id;

    const rejection = await app.inject({
      method: "POST", url: `/api/v1/admin/organization-requests/${rejectedRequestId}/reject`,
      headers: { authorization: `Bearer ${superadminToken}` }, payload: { reason: "Insufficient organization details." },
    });
    expect(rejection.statusCode).toBe(200);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, secondRequesterId));
    expect(updatedUser?.role).toBe("user");
    expect(updatedUser?.orgId).toBeNull();
    expect(emailCalls.some((call) => call.startsWith("rejected:"))).toBe(true);
  });

  it("sends each due reminder only once", async () => {
    const [request] = await db.insert(organizationRequests).values({
      requesterId: reminderRequesterId, organizationName: "Reminder Center", createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    }).returning();
    reminderRequestId = request!.id;

    const first = await organizationRequestService.sendReminders();
    const second = await organizationRequestService.sendReminders();
    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);

    const reminders = await db.select().from(organizationRequestReminders).where(eq(organizationRequestReminders.requestId, reminderRequestId));
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.reminderType).toBe("24h");
  });
});
