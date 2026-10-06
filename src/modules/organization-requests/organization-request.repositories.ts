import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";

import { db } from "@/database/index.ts";
import { organizationRequestReminders, organizationRequests } from "@/database/schema/organization-requests.ts";
import { organizations } from "@/database/schema/organizations.ts";
import { users } from "@/database/schema/users.ts";
import { ConflictError, NotFoundError } from "@/shared/errors/index.ts";

import type { CreateOrganizationRequestInput, ListOrganizationRequestsQuery } from "./organization-request.schemas.ts";

export class OrganizationRequestRepository {
  async create(requesterId: string, input: CreateOrganizationRequestInput) {
    return db.transaction(async (tx) => {
      const [requester] = await tx.select().from(users).where(and(eq(users.id, requesterId), isNull(users.deletedAt))).limit(1);
      if (!requester || !requester.isActive) throw new NotFoundError("Requester account not found.");
      if (requester.role !== "user" || requester.orgId) {
        throw new ConflictError("Only an unassigned normal user can request an organization.");
      }

      const [existing] = await tx
        .select({ id: organizationRequests.id })
        .from(organizationRequests)
        .where(and(eq(organizationRequests.requesterId, requesterId), eq(organizationRequests.status, "pending")))
        .limit(1);
      if (existing) throw new ConflictError("You already have a pending organization request.");

      const [created] = await tx.insert(organizationRequests).values({
        requesterId,
        organizationName: input.organizationName,
        organizationDescription: input.organizationDescription,
      }).returning();
      return { request: created!, requester };
    });
  }

  async findForRequester(requesterId: string) {
    const rows = await db.select().from(organizationRequests)
      .where(eq(organizationRequests.requesterId, requesterId))
      .orderBy(desc(organizationRequests.createdAt));
    return rows;
  }

  async list(query: ListOrganizationRequestsQuery) {
    const conditions: (SQL | undefined)[] = [];
    if (query.status) conditions.push(eq(organizationRequests.status, query.status));
    const where = and(...conditions);
    const [totalRow] = await db.select({ total: count() }).from(organizationRequests).where(where);
    const rows = await db.select({
      request: organizationRequests,
      requester: { id: users.id, email: users.email, displayName: users.displayName, role: users.role, orgId: users.orgId },
    }).from(organizationRequests)
      .innerJoin(users, eq(users.id, organizationRequests.requesterId))
      .where(where)
      .orderBy(desc(organizationRequests.createdAt))
      .limit(query.limit).offset(query.offset);
    return { rows, total: Number(totalRow?.total || 0) };
  }

  async findById(id: string) {
    const [row] = await db.select({
      request: organizationRequests,
      requester: { id: users.id, email: users.email, displayName: users.displayName, role: users.role, orgId: users.orgId },
    }).from(organizationRequests).innerJoin(users, eq(users.id, organizationRequests.requesterId))
      .where(eq(organizationRequests.id, id)).limit(1);
    return row || null;
  }

  async approve(id: string, reviewerId: string, slug: string) {
    return db.transaction(async (tx) => {
      const [request] = await tx.select().from(organizationRequests)
        .where(and(eq(organizationRequests.id, id), eq(organizationRequests.status, "pending"))).limit(1);
      if (!request) throw new NotFoundError("Pending organization request not found.");
      const [requester] = await tx.select().from(users).where(and(eq(users.id, request.requesterId), isNull(users.deletedAt))).limit(1);
      if (!requester || requester.role !== "user" || requester.orgId) {
        throw new ConflictError("The requester is no longer eligible for organization-admin promotion.");
      }
      const [organization] = await tx.insert(organizations).values({
        name: request.organizationName,
        slug,
        description: request.organizationDescription,
        createdBy: requester.id,
      }).returning();
      const [updatedUser] = await tx.update(users).set({ role: "org_admin", orgId: organization!.id, updatedAt: new Date() })
        .where(and(eq(users.id, requester.id), eq(users.role, "user"), isNull(users.orgId), isNull(users.deletedAt))).returning();
      if (!updatedUser) throw new ConflictError("Requester could not be promoted safely.");
      const [updatedRequest] = await tx.update(organizationRequests).set({
        status: "approved", organizationId: organization!.id, reviewedBy: reviewerId, reviewedAt: new Date(), updatedAt: new Date(),
      }).where(and(eq(organizationRequests.id, id), eq(organizationRequests.status, "pending"))).returning();
      if (!updatedRequest) throw new ConflictError("Request was reviewed by another administrator.");
      return { request: updatedRequest, organization: organization!, requester: updatedUser };
    });
  }

  async reject(id: string, reviewerId: string, reason: string) {
    const [updated] = await db.update(organizationRequests).set({
      status: "rejected", rejectionReason: reason, reviewedBy: reviewerId, reviewedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(organizationRequests.id, id), eq(organizationRequests.status, "pending"))).returning();
    if (!updated) throw new NotFoundError("Pending organization request not found.");
    const row = await this.findById(id);
    if (!row) throw new NotFoundError("Organization request not found.");
    return row;
  }

  async findPendingForReminders(cutoff: Date) {
    return db.select({ request: organizationRequests, requester: { email: users.email, displayName: users.displayName } })
      .from(organizationRequests).innerJoin(users, eq(users.id, organizationRequests.requesterId))
      .where(and(eq(organizationRequests.status, "pending"), isNull(users.deletedAt), eq(users.isActive, true)))
      .then((rows) => rows.filter(({ request }) => request.createdAt <= cutoff));
  }

  async claimReminder(requestId: string, reminderType: "24h" | "3d" | "7d") {
    try {
      const [row] = await db.insert(organizationRequestReminders).values({ requestId, reminderType }).onConflictDoNothing().returning();
      return Boolean(row);
    } catch {
      return false;
    }
  }
}

export const organizationRequestRepository = new OrganizationRequestRepository();
