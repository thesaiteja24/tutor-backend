import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "@/shared/errors/index.ts";
import { verifyJwtToken, type UserJwtPayload } from "@/shared/auth/jwt.ts";

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
  request.user = payload;
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
