import { eq } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { users } from "@/database/schema/users.ts";

export const DEFAULT_USER_ID = "01950000-0000-7000-8000-000000000000";
export const DEFAULT_USER_EMAIL = "demo@tutor.app";

export async function seedDefaultUser() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, DEFAULT_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    console.log("ℹ️ Default user already exists:", existing[0]?.email);
    return existing[0];
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      displayName: "Demo Student",
      nativeLanguage: "te",
      englishLevel: "intermediate",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { displayName: "Demo Student", nativeLanguage: "te" },
    })
    .returning();

  console.log("✅ Seeded default user:", newUser?.displayName, `(${newUser?.id})`);
  return newUser;
}
