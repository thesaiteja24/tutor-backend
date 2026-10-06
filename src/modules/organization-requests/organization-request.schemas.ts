import { z } from "zod";

import { uuidv7Schema } from "@/shared/schemas/identifiers.ts";

export const createOrganizationRequestSchema = z.strictObject({
  organizationName: z.string().trim().min(2).max(150),
  organizationDescription: z.string().trim().max(2000).optional(),
});

export const listOrganizationRequestsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const organizationRequestIdParamsSchema = z.strictObject({ id: uuidv7Schema });

export const rejectOrganizationRequestSchema = z.strictObject({
  reason: z.string().trim().min(3).max(2000),
});

export type CreateOrganizationRequestInput = z.infer<typeof createOrganizationRequestSchema>;
export type ListOrganizationRequestsQuery = z.infer<typeof listOrganizationRequestsQuerySchema>;
export type RejectOrganizationRequestInput = z.infer<typeof rejectOrganizationRequestSchema>;
