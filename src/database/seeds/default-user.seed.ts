import { db } from "@/database/index.ts";
import { type UserRole,users } from "@/database/schema/users.ts";

export const DEFAULT_USER_ID = "01950000-0000-7000-8000-000000000000";
export const SUPERADMIN_USER_ID = "01950000-0000-7000-8000-000000000001";
export const ORGADMIN_USER_ID = "01950000-0000-7000-8000-000000000002";

export const SEEDED_USERS = [
  {
    id: SUPERADMIN_USER_ID,
    email: "admin@tutor.com",
    password: "Admin@1234",
    displayName: "Super Admin",
    role: "superadmin" as UserRole,
    nativeLanguage: "en",
    englishLevel: "advanced",
    isEmailVerified: true,
  },
  {
    id: ORGADMIN_USER_ID,
    email: "org@tutor.com",
    password: "Org@1234",
    displayName: "Org Admin",
    role: "org_admin" as UserRole,
    nativeLanguage: "te",
    englishLevel: "advanced",
    isEmailVerified: true,
  },
  {
    id: DEFAULT_USER_ID,
    email: "test@tutor.com",
    password: "Test@1234",
    displayName: "Test User",
    role: "user" as UserRole,
    nativeLanguage: "te",
    englishLevel: "intermediate",
    isEmailVerified: true,
  },
];

export async function seedDefaultUser() {
  const seeded = [];

  for (const item of SEEDED_USERS) {
    const passwordHash = await Bun.password.hash(item.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });

    const [user] = await db
      .insert(users)
      .values({
        id: item.id,
        email: item.email,
        passwordHash,
        displayName: item.displayName,
        role: item.role,
        nativeLanguage: item.nativeLanguage,
        englishLevel: item.englishLevel,
        isEmailVerified: item.isEmailVerified,
        authProvider: "local",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: item.email,
          passwordHash,
          displayName: item.displayName,
          role: item.role,
          nativeLanguage: item.nativeLanguage,
          englishLevel: item.englishLevel,
          isEmailVerified: item.isEmailVerified,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (user) {
      seeded.push(user);
      console.log(`✅ Seeded ${item.role}: ${user.displayName} (${user.email})`);
    }
  }

  return seeded[2] || seeded[0]; // Return default user
}
