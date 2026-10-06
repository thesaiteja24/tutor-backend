import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export type OrganizationRequestStatus = "pending" | "approved" | "rejected";
export type OrganizationRequestReminderType = "24h" | "3d" | "7d";

export const organizationRequests = pgTable(
  "organization_requests",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    requesterId: uuid("requester_id").notNull(),
    organizationName: varchar("organization_name", { length: 150 }).notNull(),
    organizationDescription: varchar("organization_description", { length: 2000 }),
    status: varchar("status", { length: 20 }).$type<OrganizationRequestStatus>().notNull().default("pending"),
    organizationId: uuid("organization_id"),
    reviewedBy: uuid("reviewed_by"),
    rejectionReason: varchar("rejection_reason", { length: 2000 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("organization_requests_status_idx").on(table.status, table.createdAt),
    index("organization_requests_requester_idx").on(table.requesterId, table.createdAt),
    uniqueIndex("organization_requests_one_pending_requester_idx")
      .on(table.requesterId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const organizationRequestReminders = pgTable(
  "organization_request_reminders",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    requestId: uuid("request_id").notNull(),
    reminderType: varchar("reminder_type", { length: 10 }).$type<OrganizationRequestReminderType>().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_request_reminders_request_type_idx").on(table.requestId, table.reminderType),
    index("organization_request_reminders_request_idx").on(table.requestId),
  ],
);

export type OrganizationRequest = typeof organizationRequests.$inferSelect;
export type NewOrganizationRequest = typeof organizationRequests.$inferInsert;
export type OrganizationRequestReminder = typeof organizationRequestReminders.$inferSelect;
