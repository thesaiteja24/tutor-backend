import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

import { conversations } from "./conversations.ts";

export interface LatencyMetrics {
  sttMs?: number;
  llmMs?: number;
  ttsMs?: number;
  ttfaMs?: number;
  ttftMs?: number;
  totalMs?: number;
  ttsInputCharacters?: number;
  ttsAudioBytes?: number;
  streamChunks?: number;
  cacheHit?: boolean;
}

export type MessageStatus = "pending" | "completed" | "failed" | "abandoned";

export interface TranscriptMetadata {
  source: "audio" | "text";
  requestedLanguage?: string;
  detectedLanguage?: string;
  detectedScript?: string;
  // `null` explicitly records a provider response without confidence.
  confidence?: number | null;
  confidenceSource?: "provider" | "unavailable";
  durationSeconds?: number;
  activitySelection?: {
    activityId: string;
    optionId: string;
    optionLabel: string;
  };
}

export interface TurnFailureData {
  stage: "stt" | "llm" | "tts" | "unknown";
  code: string;
  retryable: boolean;
  occurredAt: string;
}

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: varchar("sender", { length: 20 }).notNull(), // 'user' | 'assistant'
    // A user message and its assistant reply share this id. Legacy messages remain null.
    turnId: uuid("turn_id"),
    // Pending/failed messages are deliberately omitted from normal history and LLM context.
    status: varchar("status", { length: 20 }).$type<MessageStatus>().notNull().default("completed"),
    content: text("content").notNull(), // Display text for UI
    transcriptMetadata: jsonb("transcript_metadata").$type<TranscriptMetadata>(),
    audioUrl: varchar("audio_url", { length: 500 }),
    latencyMetrics: jsonb("latency_metrics").$type<LatencyMetrics>(),
    responseData: jsonb("response_data").$type<Record<string, unknown>>(),
    failureData: jsonb("failure_data").$type<TurnFailureData>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_created_at_idx").on(table.createdAt),
    index("messages_turn_id_idx").on(table.turnId),
    index("messages_conversation_status_created_at_idx").on(table.conversationId, table.status, table.createdAt),
  ],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
