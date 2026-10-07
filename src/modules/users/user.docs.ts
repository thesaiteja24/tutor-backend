export const metaSchema = {
  type: "object",
  properties: {
    timestamp: { type: "string", example: "2026-10-07T12:00:00.000Z" },
    requestId: { type: "string", example: "0199c0d1-e64e-7b90-93a6-bdf3f32bbd92" },
  },
};

export const userProfileSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "0199c0d1-e64e-7b90-93a6-bdf3f32bbd92" },
    email: { type: "string", format: "email", example: "student@example.com" },
    displayName: { type: "string", example: "Sai Teja" },
    role: { type: "string", enum: ["user", "superadmin", "org_admin"], example: "user" },
    orgId: { type: "string", format: "uuid", nullable: true, example: null },
    nativeLanguage: { type: "string", example: "te" },
    englishLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"], example: "intermediate" },
    isEmailVerified: { type: "boolean", example: true },
    authProvider: { type: "string", example: "local" },
    isActive: { type: "boolean", example: true },
    lastLoginAt: { type: "string", nullable: true, example: "2026-10-07T12:00:00.000Z" },
    createdAt: { type: "string", example: "2026-10-01T08:00:00.000Z" },
    updatedAt: { type: "string", example: "2026-10-07T12:00:00.000Z" },
  },
};

export const userAnalyticsSchema = {
  type: "object",
  properties: {
    totalSpeakingSeconds: { type: "integer", example: 3420 },
    totalSessions: { type: "integer", example: 12 },
    currentStreakDays: { type: "integer", example: 5 },
    vocabularyCount: { type: "integer", example: 48 },
    skillBreakdown: {
      type: "object",
      properties: {
        pronunciation: { type: "number", example: 82.5 },
        fluency: { type: "number", example: 78.0 },
        grammar: { type: "number", example: 85.0 },
        vocabulary: { type: "number", example: 74.0 },
      },
    },
  },
};

function createErrorSchema(code: string, message: string, field?: string) {
  return {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: message },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string", example: code },
            field: { type: "string", example: field ?? "request" },
            message: { type: "string", example: message },
            details: { nullable: true },
          },
        },
      },
      meta: metaSchema,
    },
  };
}

export const badRequestSchema = createErrorSchema("BAD_REQUEST", "Invalid request parameters or payload", "id");
export const unauthorizedSchema = createErrorSchema("UNAUTHORIZED", "Missing or invalid Bearer access token");
export const forbiddenSchema = createErrorSchema("FORBIDDEN", "You do not have permission to access or modify this profile");
export const notFoundSchema = createErrorSchema("NOT_FOUND", "Student profile not found");
export const internalServerErrorSchema = createErrorSchema("INTERNAL_SERVER_ERROR", "An unexpected server error occurred");

export const getMeRouteDoc = {
  tags: ["Users"],
  summary: "Get current authenticated user profile",
  description: "Retrieves the student profile associated with the authenticated JWT.",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: "User profile retrieved successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User profile retrieved successfully" },
        data: userProfileSchema,
        meta: metaSchema,
      },
    },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const updateMeRouteDoc = {
  tags: ["Users"],
  summary: "Update current authenticated user profile",
  description: "Updates the authenticated student's display name, native language, or English proficiency level.",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    properties: {
      displayName: { type: "string", minLength: 2, maxLength: 100, example: "Sai Teja" },
      nativeLanguage: {
        type: "string",
        enum: ["te", "hi", "ta", "kn", "bn", "mr", "gu", "pa", "ml", "en"],
        example: "te",
      },
      englishLevel: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced"],
        example: "intermediate",
      },
    },
  },
  response: {
    200: {
      description: "User profile updated successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User profile updated successfully" },
        data: userProfileSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Validation error", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const getMyAnalyticsRouteDoc = {
  tags: ["Users"],
  summary: "Get current user practice analytics & dashboard KPIs",
  description: "Retrieves speaking time, practice streak, session counts, vocabulary metrics, and skill breakdown scores.",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: "User analytics retrieved successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User analytics retrieved successfully" },
        data: userAnalyticsSchema,
        meta: metaSchema,
      },
    },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const getUserByIdRouteDoc = {
  tags: ["Users"],
  summary: "Get user profile by ID",
  description: "Retrieves a student profile by their unique identifier (accessible by the account owner or superadmin).",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", example: "0199c0d1-e64e-7b90-93a6-bdf3f32bbd92" },
    },
  },
  response: {
    200: {
      description: "User profile retrieved successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User profile retrieved successfully" },
        data: userProfileSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Invalid UUID identifier", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - not owner or superadmin", ...forbiddenSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const updateUserByIdRouteDoc = {
  tags: ["Users"],
  summary: "Update user profile by ID",
  description: "Updates a student profile's display name, native language, or English level (accessible by owner or superadmin).",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", example: "0199c0d1-e64e-7b90-93a6-bdf3f32bbd92" },
    },
  },
  body: {
    type: "object",
    properties: {
      displayName: { type: "string", minLength: 2, maxLength: 100, example: "Sai Teja" },
      nativeLanguage: {
        type: "string",
        enum: ["te", "hi", "ta", "kn", "bn", "mr", "gu", "pa", "ml", "en"],
        example: "te",
      },
      englishLevel: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced"],
        example: "intermediate",
      },
    },
  },
  response: {
    200: {
      description: "User profile updated successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User profile updated successfully" },
        data: userProfileSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Invalid UUID or body parameters", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - not owner or superadmin", ...forbiddenSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};
