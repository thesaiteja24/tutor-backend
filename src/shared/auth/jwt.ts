import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "@/config/index.ts";
import type { UserRole } from "@/database/schema/users.ts";
import { UnauthorizedError } from "@/shared/errors/index.ts";
import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";

export interface UserJwtPayload {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  orgId?: string | null;
  nativeLanguage: string;
  englishLevel: string;
}

const jwtPayloadSchema = z.strictObject({
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  userId: uuidv7Schema,
  email: z.email(),
  displayName: z.string().min(1).max(100),
  role: z.enum(["user", "superadmin", "org_admin"]),
  orgId: uuidv7Schema.nullable().optional(),
  nativeLanguage: z.string().min(1).max(20),
  englishLevel: z.string().min(1).max(20),
});

/**
 * Signs a 30-day JWT token with the user profile payload.
 */
export function signJwtToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: (env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) || "30d",
  });
}

/**
 * Verifies a JWT token and returns the decoded payload.
 */
export function verifyJwtToken(token: string): UserJwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserJwtPayload & { iat: number; exp: number };
    const parsed = jwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new UnauthorizedError("Invalid authentication token.");
    }
    return {
      userId: parsed.data.userId,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      orgId: parsed.data.orgId || null,
      nativeLanguage: parsed.data.nativeLanguage,
      englishLevel: parsed.data.englishLevel,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw new UnauthorizedError("Authentication token has expired. Please sign in again.");
    }
    throw new UnauthorizedError("Invalid authentication token.");
  }
}
