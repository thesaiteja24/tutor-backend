import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export type OtpPurpose = "email_verification" | "password_reset" | "email_change";

export const authOtps = pgTable(
  "auth_otps",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    email: varchar("email", { length: 255 }).notNull(),
    otpHash: varchar("otp_hash", { length: 255 }).notNull(),
    purpose: varchar("purpose", { length: 50 }).$type<OtpPurpose>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    isUsed: boolean("is_used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_otps_email_purpose_idx").on(table.email, table.purpose, table.isUsed),
    index("auth_otps_expires_at_idx").on(table.expiresAt),
  ],
);

export type AuthOtp = typeof authOtps.$inferSelect;
export type NewAuthOtp = typeof authOtps.$inferInsert;
