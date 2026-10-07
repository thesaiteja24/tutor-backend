export const metaSchema = {
  type: "object",
  properties: {
    timestamp: { type: "string", example: "2026-10-07T12:00:00.000Z" },
    requestId: { type: "string", example: "0199c0d1-e64e-7b90-93a6-bdf3f32bbd92" },
  },
};

export const paginatedMetaSchema = {
  type: "object",
  properties: {
    timestamp: { type: "string", example: "2026-10-07T12:00:00.000Z" },
    requestId: { type: "string", example: "0199c0d1-e64e-7b90-93a6-bdf3f32bbd92" },
    total: { type: "integer", example: 4 },
    limit: { type: "integer", example: 20 },
    offset: { type: "integer", example: 0 },
    hasMore: { type: "boolean", example: false },
  },
};

export const personaDocSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "01950000-0000-7000-8000-000000000001" },
    name: { type: "string", example: "Maya" },
    voiceId: { type: "string", example: "b72c4802" },
    avatarUrl: { type: "string", nullable: true, example: "/static/avatars/maya.png" },
    sampleAudioUrl: { type: "string", nullable: true, example: "/static/audio/personas/maya/preview_te.wav" },
    previewAudiosByLang: {
      type: "object",
      nullable: true,
      properties: {
        en: { type: "string", example: "/static/audio/personas/maya/preview_en.wav" },
        te: { type: "string", example: "/static/audio/personas/maya/preview_te.wav" },
        hi: { type: "string", example: "/static/audio/personas/maya/preview_hi.wav" },
        ta: { type: "string", example: "/static/audio/personas/maya/preview_ta.wav" },
        kn: { type: "string", example: "/static/audio/personas/maya/preview_kn.wav" },
        ml: { type: "string", example: "/static/audio/personas/maya/preview_ml.wav" },
      },
      additionalProperties: { type: "string" },
    },
    description: {
      type: "string",
      example: "High-energy, bubbly, and modern conversation buddy who makes speaking English feel effortless and fun.",
    },
    systemPrompt: {
      type: "string",
      example: "You are Maya, a vibrant, expressive, and fun-loving Gen-Z English tutor...",
    },
    createdAt: { type: "string", example: "2026-10-01T08:00:00.000Z" },
    updatedAt: { type: "string", example: "2026-10-07T12:00:00.000Z" },
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
          },
        },
      },
      meta: metaSchema,
    },
  };
}

export const badRequestSchema = createErrorSchema("BAD_REQUEST", "Invalid persona query or payload format");
export const unauthorizedSchema = createErrorSchema("UNAUTHORIZED", "Authentication required");
export const forbiddenSchema = createErrorSchema("FORBIDDEN", "Superadmin permission required");
export const notFoundSchema = createErrorSchema("NOT_FOUND", "Tutor persona not found");
export const internalServerErrorSchema = createErrorSchema("INTERNAL_ERROR", "Internal server error occurred");

// ---------------------------------------------------------------------------
// Learner Endpoints
// ---------------------------------------------------------------------------

export const listPersonasRouteDoc = {
  tags: ["Personas"],
  summary: "List all active tutor personas",
  description: "Returns paginated active tutor personas with round avatars, descriptions, and 6-language audio preview URLs.",
  querystring: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20, example: 20 },
      offset: { type: "integer", minimum: 0, default: 0, example: 0 },
    },
  },
  response: {
    200: {
      description: "Paginated list of tutor personas",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Personas retrieved successfully" },
        data: {
          type: "array",
          items: personaDocSchema,
        },
        meta: paginatedMetaSchema,
      },
    },
    400: { description: "Invalid pagination query", ...badRequestSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const getPersonaRouteDoc = {
  tags: ["Personas"],
  summary: "Get single tutor persona by ID",
  description: "Retrieves complete persona profile including voice ID, regional audio previews, and pedagogical traits.",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", example: "01950000-0000-7000-8000-000000000001" },
    },
  },
  response: {
    200: {
      description: "Persona details",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Persona retrieved successfully" },
        data: personaDocSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Invalid persona UUID", ...badRequestSchema },
    404: { description: "Persona not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

// ---------------------------------------------------------------------------
// Superadmin Prompt Studio Endpoints
// ---------------------------------------------------------------------------

export const adminListPersonasRouteDoc = {
  tags: ["Admin Personas"],
  summary: "List all tutor personas for prompt studio",
  description: "Returns all tutor personas with system prompts, voice configurations, and preview audios.",
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20, example: 20 },
      offset: { type: "integer", minimum: 0, default: 0, example: 0 },
    },
  },
  response: {
    200: {
      description: "Paginated list of admin personas",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Admin personas retrieved successfully" },
        data: {
          type: "array",
          items: personaDocSchema,
        },
        meta: paginatedMetaSchema,
      },
    },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - Superadmin only", ...forbiddenSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const adminGetPersonaRouteDoc = {
  tags: ["Admin Personas"],
  summary: "Get single persona details for prompt editing",
  description: "Returns full system prompt and voice model configuration for a single persona.",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", example: "01950000-0000-7000-8000-000000000001" },
    },
  },
  response: {
    200: {
      description: "Persona details",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Persona details retrieved successfully" },
        data: personaDocSchema,
        meta: metaSchema,
      },
    },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - Superadmin only", ...forbiddenSchema },
    404: { description: "Persona not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const adminCreatePersonaRouteDoc = {
  tags: ["Admin Personas"],
  summary: "Create a new tutor persona",
  description: "Superadmin endpoint to create a new AI tutor with backstory, system prompt, and Omnivoice profile ID.",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["name", "description", "systemPrompt"],
    properties: {
      name: { type: "string", example: "Maya" },
      voiceId: { type: "string", default: "b72c4802", example: "b72c4802" },
      avatarUrl: { type: "string", nullable: true, example: "/static/avatars/maya.png" },
      sampleAudioUrl: { type: "string", nullable: true, example: "/static/audio/personas/maya/preview_te.wav" },
      description: { type: "string", example: "High-energy, bubbly, and modern conversation buddy." },
      systemPrompt: { type: "string", example: "You are Maya, a vibrant, expressive English tutor..." },
    },
  },
  response: {
    201: {
      description: "Persona created successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Persona created successfully" },
        data: personaDocSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Validation error", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - Superadmin only", ...forbiddenSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const adminUpdatePersonaRouteDoc = {
  tags: ["Admin Personas"],
  summary: "Update persona prompt or voice model",
  description: "Allows superadmin to update persona system prompts, voice configs, avatar URL, or preview audios.",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", example: "01950000-0000-7000-8000-000000000001" },
    },
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string", example: "Maya" },
      voiceId: { type: "string", example: "b72c4802" },
      avatarUrl: { type: "string", nullable: true, example: "/static/avatars/maya.png" },
      sampleAudioUrl: { type: "string", nullable: true, example: "/static/audio/personas/maya/preview_te.wav" },
      description: { type: "string", example: "Updated description..." },
      systemPrompt: { type: "string", example: "Updated system prompt..." },
    },
  },
  response: {
    200: {
      description: "Persona updated successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Persona updated successfully" },
        data: personaDocSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Validation error", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - Superadmin only", ...forbiddenSchema },
    404: { description: "Persona not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const adminDeletePersonaRouteDoc = {
  tags: ["Admin Personas"],
  summary: "Soft delete / deactivate tutor persona",
  description: "Superadmin endpoint to deactivate a tutor persona from the platform.",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid", example: "01950000-0000-7000-8000-000000000001" },
    },
  },
  response: {
    200: {
      description: "Persona deleted successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Persona deleted successfully" },
        data: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            deleted: { type: "boolean", example: true },
          },
        },
        meta: metaSchema,
      },
    },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    403: { description: "Forbidden - Superadmin only", ...forbiddenSchema },
    404: { description: "Persona not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};
