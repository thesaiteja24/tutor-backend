import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { users, type User, type NewUser } from "@/database/schema/users.ts";
import { authOtps, type AuthOtp, type OtpPurpose } from "@/database/schema/auth-otps.ts";

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] || null;
  }

  async createUser(data: NewUser): Promise<User> {
    const [inserted] = await db
      .insert(users)
      .values({
        ...data,
        email: data.email.toLowerCase(),
      })
      .returning();
    return inserted!;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const rows = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return rows[0] || null;
  }

  async createOtp(data: {
    email: string;
    otpHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<AuthOtp> {
    // Invalidate existing unused OTPs for this email and purpose
    await db
      .update(authOtps)
      .set({ isUsed: true })
      .where(and(eq(authOtps.email, data.email.toLowerCase()), eq(authOtps.purpose, data.purpose), eq(authOtps.isUsed, false)));

    const [inserted] = await db
      .insert(authOtps)
      .values({
        email: data.email.toLowerCase(),
        otpHash: data.otpHash,
        purpose: data.purpose,
        expiresAt: data.expiresAt,
        attempts: 0,
        isUsed: false,
      })
      .returning();

    return inserted!;
  }

  async findLatestActiveOtp(email: string, purpose: OtpPurpose): Promise<AuthOtp | null> {
    const now = new Date();
    const rows = await db
      .select()
      .from(authOtps)
      .where(
        and(
          eq(authOtps.email, email.toLowerCase()),
          eq(authOtps.purpose, purpose),
          eq(authOtps.isUsed, false),
          gt(authOtps.expiresAt, now),
          lt(authOtps.attempts, 5)
        )
      )
      .orderBy(desc(authOtps.createdAt))
      .limit(1);

    return rows[0] || null;
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    const otp = await db.select().from(authOtps).where(eq(authOtps.id, id)).limit(1);
    if (otp[0]) {
      const nextAttempts = otp[0].attempts + 1;
      await db
        .update(authOtps)
        .set({
          attempts: nextAttempts,
          isUsed: nextAttempts >= 5,
        })
        .where(eq(authOtps.id, id));
    }
  }

  async markOtpUsed(id: string): Promise<void> {
    await db
      .update(authOtps)
      .set({ isUsed: true })
      .where(eq(authOtps.id, id));
  }

  async getLatestOtpCreatedAt(email: string, purpose: OtpPurpose): Promise<Date | null> {
    const rows = await db
      .select({ createdAt: authOtps.createdAt })
      .from(authOtps)
      .where(and(eq(authOtps.email, email.toLowerCase()), eq(authOtps.purpose, purpose)))
      .orderBy(desc(authOtps.createdAt))
      .limit(1);

    return rows[0]?.createdAt || null;
  }
}

export const authRepository = new AuthRepository();
