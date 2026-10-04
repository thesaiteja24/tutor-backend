import jwt from "jsonwebtoken";
import { env } from "@/config/index.ts";
import { UnauthorizedError } from "@/shared/errors/index.ts";

export interface UserJwtPayload {
  userId: string;
  email: string;
  displayName: string;
  nativeLanguage: string;
  englishLevel: string;
}

/**
 * Signs a 30-day JWT token with the user profile payload.
 */
export function signJwtToken(payload: UserJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: (env.JWT_EXPIRES_IN as any) || "30d",
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
      nativeLanguage: decoded.nativeLanguage,
      englishLevel: decoded.englishLevel,
    };
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new UnauthorizedError("Authentication token has expired. Please sign in again.");
    }
    throw new UnauthorizedError("Invalid authentication token.");
  }
}
