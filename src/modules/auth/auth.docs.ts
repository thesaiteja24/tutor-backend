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
    englishLevel: { type: "string", example: "intermediate" },
    isEmailVerified: { type: "boolean", example: true },
    authProvider: { type: "string", example: "local" },
    isActive: { type: "boolean", example: true },
    lastLoginAt: { type: "string", nullable: true, example: "2026-10-07T12:00:00.000Z" },
    createdAt: { type: "string", example: "2026-10-01T08:00:00.000Z" },
    updatedAt: { type: "string", example: "2026-10-07T12:00:00.000Z" },
  },
};

export const authSuccessSchema = {
  type: "object",
  properties: {
    user: userProfileSchema,
    token: { type: "string", description: "30-day JWT Bearer token", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
  },
};

export function createErrorSchema(code: string, message: string, field?: string) {
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

export const badRequestSchema = createErrorSchema("BAD_REQUEST", "Validation error or invalid request parameters", "email");
export const unauthorizedSchema = createErrorSchema("UNAUTHORIZED", "Invalid credentials or missing Bearer token");
export const forbiddenSchema = createErrorSchema("FORBIDDEN", "Account is suspended or lacks required permissions");
export const notFoundSchema = createErrorSchema("NOT_FOUND", "User account or resource not found");
export const conflictSchema = createErrorSchema("CONFLICT", "An account with this email address already exists");
export const rateLimitSchema = createErrorSchema("TOO_MANY_REQUESTS", "Rate limit exceeded. Please try again later.");
export const internalServerErrorSchema = createErrorSchema("INTERNAL_SERVER_ERROR", "An unexpected internal server error occurred");

export const registerRouteDoc = {
  tags: ["Auth"],
  summary: "Register new student account",
  description: "Validates password complexity (8+ chars, uppercase, lowercase, digit, special symbol), creates unverified account, and sends a 6-digit OTP verification email.",
  body: {
    type: "object",
    required: ["email", "password", "displayName"],
    properties: {
      email: { type: "string", format: "email", example: "student@example.com" },
      password: { type: "string", minLength: 8, example: "Password@123" },
      displayName: { type: "string", minLength: 2, example: "Sai Teja" },
      nativeLanguage: { type: "string", default: "te", example: "te" },
      englishLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"], default: "intermediate", example: "intermediate" },
    },
  },
  response: {
    201: {
      description: "Verification code sent to email",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Verification code sent to your email address." },
        data: {
          type: "object",
          properties: {
            email: { type: "string", example: "student@example.com" },
            displayName: { type: "string", example: "Sai Teja" },
            message: { type: "string", example: "Verification OTP dispatched." },
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Validation error or password policy failure", ...badRequestSchema },
    409: { description: "Email already registered", ...conflictSchema },
    429: { description: "Too many registration attempts", ...rateLimitSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const verifyEmailRouteDoc = {
  tags: ["Auth"],
  summary: "Verify registration OTP code",
  description: "Validates 6-digit email OTP, marks account verified, dispatches Welcome email, and issues 30-day JWT.",
  body: {
    type: "object",
    required: ["email", "otp"],
    properties: {
      email: { type: "string", format: "email", example: "student@example.com" },
      otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
    },
  },
  response: {
    200: {
      description: "Email verified successfully & authenticated",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Email verified successfully" },
        data: authSuccessSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Invalid or expired OTP code", ...badRequestSchema },
    404: { description: "Account not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const resendOtpRouteDoc = {
  tags: ["Auth"],
  summary: "Resend verification or reset OTP",
  description: "Dispatches a fresh 6-digit code (rate-limited to max 1 per 60 seconds).",
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", example: "student@example.com" },
      purpose: { type: "string", enum: ["email_verification", "password_reset"], default: "email_verification", example: "email_verification" },
    },
  },
  response: {
    200: {
      description: "Fresh OTP dispatched",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Verification code sent to your email address." },
        data: {
          type: "object",
          properties: {
            email: { type: "string", example: "student@example.com" },
            message: { type: "string", example: "Verification code sent" },
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Invalid request payload", ...badRequestSchema },
    404: { description: "User not found", ...notFoundSchema },
    429: { description: "Cooldown active (max 1 request per 60 seconds)", ...rateLimitSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const loginRouteDoc = {
  tags: ["Auth"],
  summary: "Authenticate with email and password",
  description: "Validates credentials using argon2id, dispatches async New Login Alert email, and returns 30-day JWT token.",
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "student@example.com" },
      password: { type: "string", example: "Password@123" },
    },
  },
  response: {
    200: {
      description: "Authentication successful",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Login successful" },
        data: authSuccessSchema,
        meta: metaSchema,
      },
    },
    400: { description: "Validation error", ...badRequestSchema },
    401: { description: "Invalid credentials or unverified email", ...unauthorizedSchema },
    403: { description: "Account deactivated or blocked", ...forbiddenSchema },
    429: { description: "Too many login attempts", ...rateLimitSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const forgotPasswordRouteDoc = {
  tags: ["Auth"],
  summary: "Request password reset OTP",
  description: "Sends a 6-digit password reset code to registered user email.",
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", example: "student@example.com" },
    },
  },
  response: {
    200: {
      description: "Password reset OTP dispatched",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Password reset code dispatched" },
        data: {
          type: "object",
          properties: {
            email: { type: "string", example: "student@example.com" },
            message: { type: "string", example: "Reset code sent" },
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Invalid email parameter", ...badRequestSchema },
    404: { description: "No account found with this email", ...notFoundSchema },
    429: { description: "Too many reset attempts", ...rateLimitSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const resetPasswordRouteDoc = {
  tags: ["Auth"],
  summary: "Reset password using 6-digit OTP",
  description: "Validates reset OTP, updates password with argon2id hash, and sends Password Changed confirmation email.",
  body: {
    type: "object",
    required: ["email", "otp", "newPassword"],
    properties: {
      email: { type: "string", format: "email", example: "student@example.com" },
      otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
      newPassword: { type: "string", minLength: 8, example: "NewPassword@123" },
    },
  },
  response: {
    200: {
      description: "Password reset successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Password reset successful" },
        data: {
          type: "object",
          properties: {
            email: { type: "string", example: "student@example.com" },
            message: { type: "string", example: "Password reset successfully" },
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Invalid OTP or weak password", ...badRequestSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const changePasswordRouteDoc = {
  tags: ["Auth"],
  summary: "Change password (In-App)",
  description: "Allows logged-in users to change password by verifying their current password and providing a new compliant password.",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: { type: "string", example: "CurrentPassword@123" },
      newPassword: { type: "string", minLength: 8, example: "NewPassword@123" },
    },
  },
  response: {
    200: {
      description: "Password updated successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Password updated successfully" },
        data: {
          type: "object",
          properties: {
            message: { type: "string", example: "Password changed successfully" },
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Invalid password policy or identical password", ...badRequestSchema },
    401: { description: "Current password does not match or unauthenticated", ...unauthorizedSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const requestChangeEmailRouteDoc = {
  tags: ["Auth"],
  summary: "Request email address change",
  description: "Requires current password verification and dispatches 6-digit OTP code to the new email address.",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["currentPassword", "newEmail"],
    properties: {
      currentPassword: { type: "string", example: "CurrentPassword@123" },
      newEmail: { type: "string", format: "email", example: "newemail@example.com" },
    },
  },
  response: {
    200: {
      description: "Email change OTP dispatched to new email",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Verification code sent to new email address" },
        data: {
          type: "object",
          properties: {
            newEmail: { type: "string", example: "newemail@example.com" },
            message: { type: "string", example: "OTP sent" },
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Invalid email format or wrong current password", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    409: { description: "New email is already in use by another account", ...conflictSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const confirmChangeEmailRouteDoc = {
  tags: ["Auth"],
  summary: "Confirm email address change",
  description: "Verifies the 6-digit OTP sent to the new email address and updates user email profile.",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["newEmail", "otp"],
    properties: {
      newEmail: { type: "string", format: "email", example: "newemail@example.com" },
      otp: { type: "string", minLength: 6, maxLength: 6, example: "123456" },
    },
  },
  response: {
    200: {
      description: "Email address changed successfully",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Email updated successfully" },
        data: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Email address changed successfully." },
            token: { type: "string", example: "eyJhbGciOiJIUzI1Ni..." },
            user: userProfileSchema,
          },
        },
        meta: metaSchema,
      },
    },
    400: { description: "Invalid or expired OTP code", ...badRequestSchema },
    401: { description: "Unauthorized", ...unauthorizedSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};

export const getMeRouteDoc = {
  tags: ["Auth"],
  summary: "Get current authenticated user",
  description: "Returns profile details from the verified Bearer JWT.",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: "Current user profile",
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User profile retrieved" },
        data: userProfileSchema,
        meta: metaSchema,
      },
    },
    401: { description: "Invalid or expired access token", ...unauthorizedSchema },
    404: { description: "User not found", ...notFoundSchema },
    500: { description: "Internal server error", ...internalServerErrorSchema },
  },
};
