import type { FastifyRequest } from "fastify";
import { uuidv7 } from "uuidv7";
import type { PaginatedMeta, ResponseMeta } from "../schemas/response.schemas.ts";

export function formatSuccessResponse<T>(
  request: FastifyRequest,
  message: string,
  data: T
) {
  const meta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    requestId: (request.id as string) || uuidv7(),
  };

  return {
    success: true as const,
    message,
    data,
    meta,
  };
}

export function formatPaginatedResponse<T>(
  request: FastifyRequest,
  message: string,
  data: T[],
  pagination: {
    total: number;
    limit: number;
    offset?: number;
    hasMore?: boolean;
    prevCursor?: string;
    nextCursor?: string;
  }
) {
  const meta: PaginatedMeta = {
    timestamp: new Date().toISOString(),
    requestId: (request.id as string) || uuidv7(),
    total: pagination.total,
    limit: pagination.limit,
    offset: pagination.offset,
    hasMore: pagination.hasMore ?? (pagination.offset !== undefined ? pagination.offset + data.length < pagination.total : undefined),
    prevCursor: pagination.prevCursor,
    nextCursor: pagination.nextCursor,
  };

  return {
    success: true as const,
    message,
    data,
    meta,
  };
}
