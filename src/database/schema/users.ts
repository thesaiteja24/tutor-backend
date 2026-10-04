import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    nativeLanguage: varchar("native_language", { length: 20 }).notNull().default("te"),
    englishLevel: varchar("english_level", { length: 20 }).notNull().default("intermediate"),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    authProvider: varchar("auth_provider", { length: 20 }).notNull().default("local"),
    providerId: varchar("provider_id", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_auth_provider_idx").on(table.authProvider, table.providerId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

