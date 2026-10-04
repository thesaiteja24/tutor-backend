import { queryClient } from "../index.ts";
import { seedDefaultUser } from "./default-user.seed.ts";
import { seedPersonas } from "./personas.seed.ts";
import { seedPracticeModes } from "./practice-modes.seed.ts";

async function runSeeds() {
  console.log("🌱 Running database seeds...");
  try {
    await seedDefaultUser();
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
