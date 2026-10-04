import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/index.ts";
import * as relations from "./relations.ts";
import * as schema from "./schema/index.ts";

export const fullSchema = {
  ...schema,
  ...relations,
};

// For pooled queries
export const queryClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 20 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema: fullSchema });

export type Database = typeof db;
export * from "./schema/index.ts";
export * from "./relations.ts";
