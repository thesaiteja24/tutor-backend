import { env } from "@/config/index.ts";
import { authRepository } from "@/modules/auth/auth.repositories.ts";
import { hashPassword } from "@/shared/auth/password.ts";

export async function seedAdminUser() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASS) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASS are required when running database seeds");
  }

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await authRepository.findUserByEmail(email);
  const passwordHash = await hashPassword(env.ADMIN_PASS);

  const user = existing
    ? await authRepository.updateUser(existing.id, {
      passwordHash,
      displayName: existing.displayName || "Super Admin",
      role: "superadmin",
      orgId: null,
      isEmailVerified: true,
      authProvider: "local",
      isActive: true,
    })
    : await authRepository.createUser({
      email,
      passwordHash,
      displayName: "Super Admin",
      role: "superadmin",
      orgId: null,
      nativeLanguage: "en",
      englishLevel: "advanced",
      isEmailVerified: true,
      authProvider: "local",
      isActive: true,
    });

  if (!user) {
    throw new Error(`Failed to provision admin user ${email}`);
  }

  console.log(`✅ Seeded superadmin: ${user.email} (${user.id})`);
  return user;
}
