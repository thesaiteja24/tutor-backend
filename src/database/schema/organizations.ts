import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    description: text("description"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("organizations_created_by_idx").on(table.createdBy)],
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
