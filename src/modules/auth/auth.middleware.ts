import type { FastifyReply, FastifyRequest } from "fastify";

import type { UserRole } from "@/database/schema/users.ts";
import { authRepository } from "@/modules/auth/auth.repositories.ts";
import { type UserJwtPayload,verifyJwtToken } from "@/shared/auth/jwt.ts";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors/index.ts";

declare module "fastify" {
  interface FastifyRequest {
    user?: UserJwtPayload;
  }
}

/**
 * Fastify preHandler hook enforcing valid Bearer JWT authentication.
 */
export async function authenticateUser(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or malformed Authorization Bearer token.");
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyJwtToken(token);
  const user = await authRepository.findUserById(payload.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("This account is no longer active.");
  }

  // The database is authoritative for role, organization, and profile state.
  // JWT claims are only used to identify the account and are not trusted for authorization.
  request.user = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    orgId: user.orgId,
    nativeLanguage: user.nativeLanguage,
    englishLevel: user.englishLevel,
  };
}

/**
 * Fastify preHandler hook restricting access to specific user roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}].`,
      );
    }
  };
}

/**
 * Optional authentication hook that populates request.user if a valid token is supplied.
 */
export async function optionalAuthenticateUser(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7).trim();
      request.user = verifyJwtToken(token);
    } catch {
      // Ignore invalid token on optional routes
    }
  }
}
