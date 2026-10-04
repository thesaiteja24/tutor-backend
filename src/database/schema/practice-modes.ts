import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const practiceModes = pgTable("practice_modes", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type PracticeMode = typeof practiceModes.$inferSelect;
export type NewPracticeMode = typeof practiceModes.$inferInsert;
