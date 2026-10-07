import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const docsPluginAsync: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "AI English Communication Tutor API",
        description:
          "Production-grade backend API for interactive AI English communication coaching with Push-to-Talk (STT -> LLM -> TTS), Practice Modes, interactive MCQ / Read-Aloud activities, and conversation state tracking.",
        version: "1.0.0",
      },
      tags: [
        { name: "Auth", description: "User registration, Argon2id login, 6-digit OTP email verification, password reset, session refresh, and JWT profile" },
        { name: "Users", description: "Student profile, English level, native language, and learner practice analytics" },
        { name: "Personas", description: "Tutor personas, voice configurations, avatars, and character profiles for learners" },
        { name: "Admin Personas", description: "Superadmin Persona Prompt Studio, system prompts, and voice assignment" },
        { name: "Practice Modes", description: "Configurable AI tutor practice modes, coaching instructions, and home screen scenarios" },
        { name: "Voice Tutor", description: "Push-to-Talk speech-to-text, LLM tutor response, and text-to-speech interaction" },
        { name: "Conversations", description: "User conversation lifecycle and historical message sessions" },
        { name: "Organization Requests", description: "Learner organization join and creation requests" },
        { name: "Admin Analytics", description: "Superadmin platform KPIs, AI cost engine, and latency distribution" },
        { name: "Admin Users", description: "Superadmin platform user directory, role assignment, and account status management" },
        { name: "Admin Practice Modes", description: "Superadmin Practice Mode Pedagogical Prompt Studio" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter your 30-day JWT access token obtained from /api/v1/auth/login or /api/v1/auth/verify-email",
          },
        },
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local development server",
        },
      ],
    },
  });

  await fastify.register(scalar, {
    routePrefix: "/docs",
    configuration: {
      theme: "saturn",
      spec: {
        content: () => fastify.swagger(),
      },
    },
  });
};

export const docsPlugin = fp(docsPluginAsync, {
  name: "docs-plugin",
});
