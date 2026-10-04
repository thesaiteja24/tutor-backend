import { eq } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { users } from "@/database/schema/users.ts";

export const DEFAULT_USER_ID = "01950000-0000-7000-8000-000000000000";
export const DEFAULT_USER_EMAIL = "demo@tutor.app";
export const DEFAULT_USER_PASSWORD = "Password@123";

export async function seedDefaultUser() {
  const passwordHash = await Bun.password.hash(DEFAULT_USER_PASSWORD, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, DEFAULT_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(users)
      .set({
        passwordHash,
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, DEFAULT_USER_ID))
      .returning();
    console.log("ℹ️ Updated default user with password:", updated?.email);
    return updated;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      passwordHash,
      displayName: "Demo Student",
      nativeLanguage: "te",
      englishLevel: "intermediate",
      isEmailVerified: true,
      authProvider: "local",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        displayName: "Demo Student",
        nativeLanguage: "te",
        passwordHash,
        isEmailVerified: true,
      },
    })
    .returning();

  console.log("✅ Seeded default user:", newUser?.displayName, `(${newUser?.id})`);
  return newUser;
}
