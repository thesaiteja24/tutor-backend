import jwt from "jsonwebtoken";

import { env } from "@/config/index.ts";
import type { UserRole } from "@/database/schema/users.ts";
import { UnauthorizedError } from "@/shared/errors/index.ts";

export interface UserJwtPayload {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  orgId?: string | null;
  nativeLanguage: string;
  englishLevel: string;
}

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
    return {
      userId: decoded.userId,
      email: decoded.email,
      displayName: decoded.displayName,
      role: decoded.role || "user",
      orgId: decoded.orgId || null,
      nativeLanguage: decoded.nativeLanguage,
      englishLevel: decoded.englishLevel,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw new UnauthorizedError("Authentication token has expired. Please sign in again.");
    }
    throw new UnauthorizedError("Invalid authentication token.");
  }
}
