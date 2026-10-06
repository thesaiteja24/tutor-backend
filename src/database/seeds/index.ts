import { queryClient } from "../index.ts";
import { seedAdminUser } from "./admin-users.seed.ts";
import { seedPersonas } from "./personas.seed.ts";
import { seedPracticeModes } from "./practice-modes.seed.ts";

async function runSeeds() {
  console.log("🌱 Running database seeds...");
  try {
    await seedAdminUser();
    await seedPersonas();
    await seedPracticeModes();
    console.log("✨ All database seeds completed successfully!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

runSeeds();
