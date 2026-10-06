import { and, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { db } from "@/database/index.ts";
import { users } from "@/database/schema/users.ts";
import { emailService } from "@/shared/email/email.adapter.ts";
import { NotFoundError } from "@/shared/errors/index.ts";

import { organizationRequestRepository } from "./organization-request.repositories.ts";
import type { CreateOrganizationRequestInput, ListOrganizationRequestsQuery } from "./organization-request.schemas.ts";

function slugify(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140) || "organization";
  return `${normalized}-${uuidv7().slice(0, 8)}`;
}

export class OrganizationRequestService {
  async create(requesterId: string, input: CreateOrganizationRequestInput) {
    const result = await organizationRequestRepository.create(requesterId, input);
    await this.notifySubmission(result.request, result.requester);
    return result.request;
  }

  async listMine(userId: string) { return organizationRequestRepository.findForRequester(userId); }

  async list(query: ListOrganizationRequestsQuery) { return organizationRequestRepository.list(query); }

  async get(id: string) {
    const row = await organizationRequestRepository.findById(id);
    if (!row) throw new NotFoundError("Organization request not found.");
    return row;
  }

  async approve(id: string, reviewerId: string) {
    const before = await this.get(id);
    const result = await organizationRequestRepository.approve(id, reviewerId, slugify(before.request.organizationName));
    await Promise.allSettled([
      emailService.sendOrganizationRequestApproved(result.requester.email, result.requester.displayName, result.organization.name),
      this.notifySuperadmins(`Organization request approved: ${result.organization.name}`, `Request ${id} was approved by ${reviewerId}.`),
    ]);
    return result;
  }

  async reject(id: string, reviewerId: string, reason: string) {
    const row = await this.get(id);
    const result = await organizationRequestRepository.reject(id, reviewerId, reason);
    await Promise.allSettled([
      emailService.sendOrganizationRequestRejected(row.requester.email, row.requester.displayName, row.request.organizationName, reason),
      this.notifySuperadmins(`Organization request rejected: ${row.request.organizationName}`, `Request ${id} was rejected by ${reviewerId}.`),
    ]);
    return result;
  }

  async sendReminders(now = new Date()) {
    const thresholds = [
      { type: "7d" as const, age: 7 * 24 * 60 * 60 * 1000 },
      { type: "3d" as const, age: 3 * 24 * 60 * 60 * 1000 },
      { type: "24h" as const, age: 24 * 60 * 60 * 1000 },
    ];
    let sent = 0;
    for (const threshold of thresholds) {
      const rows = await organizationRequestRepository.findPendingForReminders(new Date(now.getTime() - threshold.age));
      for (const row of rows) {
        const delivered = await this.notifySuperadmins(
          `Pending organization request reminder (${threshold.type})`,
          `${row.request.organizationName} has been awaiting review since ${row.request.createdAt.toISOString()}.`,
        );
        if (delivered && await organizationRequestRepository.claimReminder(row.request.id, threshold.type)) sent += 1;
      }
    }
    return { sent };
  }

  private async notifySubmission(request: { id: string; organizationName: string }, requester: { email: string; displayName: string }) {
    await Promise.allSettled([
      emailService.sendOrganizationRequestSubmitted(requester.email, requester.displayName, request.organizationName),
      this.notifySuperadmins("New organization request for review", `${request.organizationName} was requested by ${requester.email}. Request ID: ${request.id}`),
    ]);
  }

  private async notifySuperadmins(subject: string, text: string) {
    const admins = await db.select({ email: users.email, displayName: users.displayName }).from(users)
      .where(and(eq(users.role, "superadmin"), eq(users.isActive, true), isNull(users.deletedAt)));
    const results = await Promise.all(admins.map((admin) => emailService.sendOrganizationAdminNotification(admin.email, admin.displayName, subject, text)));
    return results.length > 0 && results.every(Boolean);
  }
}

export const organizationRequestService = new OrganizationRequestService();
