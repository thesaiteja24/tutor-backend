import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "./users.ts";
import { personas } from "./personas.ts";
import { practiceModes } from "./practice-modes.ts";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personaId: uuid("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "restrict" }),
    practiceModeId: uuid("practice_mode_id")
      .notNull()
      .references(() => practiceModes.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 200 }).notNull(),
    customPrompt: text("custom_prompt"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.userId),
    index("conversations_persona_id_idx").on(table.personaId),
    index("conversations_practice_mode_id_idx").on(table.practiceModeId),
    index("conversations_status_idx").on(table.status),
  ]
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
