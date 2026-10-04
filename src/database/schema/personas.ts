import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  name: varchar("name", { length: 100 }).notNull(),
  voiceId: varchar("voice_id", { length: 50 }).notNull().default("shubh"),
  description: text("description").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  avatarUrl: text("avatar_url"),
  sampleAudioUrl: text("sample_audio_url"),
  previewAudiosByLang: jsonb("preview_audios_by_lang").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
