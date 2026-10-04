import crypto from "node:crypto";

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^~_])[A-Za-z\d@$!%*?&#^~_]{8,64}$/;

export const PASSWORD_ERROR_MESSAGE =
  "Password must be 8-64 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^~_).";

/**
 * Hashes a plaintext password using Bun's native argon2id implementation.
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}

/**
 * Verifies a plaintext password against a stored argon2id/bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Hashes a 6-digit OTP using argon2id for secure database storage.
 */
export async function hashOtp(otp: string): Promise<string> {
  return Bun.password.hash(otp, {
    algorithm: "argon2id",
    memoryCost: 32768,
    timeCost: 2,
  });
}

/**
 * Verifies a 6-digit OTP against its stored hash.
 */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(otp, hash);
  } catch {
    return false;
  }
}
