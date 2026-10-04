import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db, queryClient } from "@/database/index.ts";

async function runMigrations() {
  console.log("⏳ Applying database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./src/database/migrations" });
    console.log("✅ Migrations applied successfully!");
  } catch (err) {
    console.error("❌ Error running migrations:", err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

runMigrations();
