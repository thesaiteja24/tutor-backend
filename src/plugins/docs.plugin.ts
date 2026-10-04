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
        { name: "Voice Tutor", description: "Push-to-Talk speech-to-text, LLM tutor response, and text-to-speech interaction" },
        { name: "Practice Modes", description: "Configurable AI tutor practice modes, coaching instructions, and home screen scenarios" },
        { name: "Conversations", description: "User conversation lifecycle and historical message sessions" },
        { name: "Users", description: "Student profile and seeded default user context" },
      ],
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
