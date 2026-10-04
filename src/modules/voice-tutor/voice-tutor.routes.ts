import type { FastifyPluginAsync } from "fastify";
import { voiceTutorService } from "@/modules/voice-tutor/voice-tutor.services.ts";
import { BadRequestError } from "@/shared/errors/index.ts";
import { formatSuccessResponse } from "@/shared/utils/response.ts";
import {
  textInteractBodySchema,
  voiceInteractParamsSchema,
} from "./voice-tutor.schemas.ts";

const voiceInteractionResponseDoc = {
  description: "Voice interaction processed successfully",
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    message: { type: "string", example: "Voice interaction processed successfully" },
    data: {
      type: "object",
      properties: {
        userTranscript: {
          type: "string",
          example: "I went to the store aur maine fruits khareede.",
        },
        audioBase64: {
          type: "string",
          description: "Base64-encoded audio stream of the assistant's voice reply",
          example: "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA...",
        },
        audioFormat: { type: "string", example: "wav" },
        latencyMetrics: {
          type: "object",
          properties: {
            sttMs: { type: "number", example: 380 },
            llmMs: { type: "number", example: 540 },
            ttsMs: { type: "number", example: 290 },
            totalMs: { type: "number", example: 1210 },
          },
        },
        userMessageId: { type: "string", format: "uuid", example: "123e4567-e89b-12d3-a456-426614174000" },
        assistantMessageId: { type: "string", format: "uuid", example: "123e4567-e89b-12d3-a456-426614174001" },
        turn: {
          type: "object",
          description: "Public structured tutor turn for assistant replies, including content, quick reply options, grammar corrections, and learning state.",
          properties: {
            content: { type: "string", example: "Very good! Which sentence is grammatically correct?" },
            special: { type: "string", nullable: true, example: "Practice reading aloud: She went to the market." },
            copiable: { type: "string", nullable: true, example: "I am writing to inquire about the job opening." },
            options: {
              type: "array",
              nullable: true,
              items: {
                type: "object",
                properties: {
                  id: { type: ["number", "string"], example: 1 },
                  text: { type: "string", example: "She went to the market." },
                },
              },
            },
            correction: {
              type: "object",
              nullable: true,
              properties: {
                original: { type: "string", example: "She goed to market" },
                naturalRewrite: { type: "string", example: "She went to the market" },
                explanation: { type: "string", nullable: true, example: "Use the past tense 'went' instead of 'goed'." },
              },
            },
            learningState: {
              type: "object",
              nullable: true,
              properties: {
                topic: { type: "string", nullable: true, example: "Past Tense Verbs" },
                introducedTerms: { type: "array", items: { type: "string" }, example: ["went", "market"] },
                targetSkill: { type: "string", nullable: true, example: "grammar" },
              },
            },
          },
        },
      },
    },
    meta: {
      type: "object",
      properties: {
        timestamp: { type: "string", example: "2026-09-27T00:00:00.000Z" },
        requestId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174002" },
      },
    },
  },
};

export const voiceTutorRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/voice-tutor/conversations/:conversationId/interact (Multipart Audio Push-to-Talk)
  fastify.post(
    "/conversations/:conversationId/interact",
    {
      schema: {
        tags: ["Voice Tutor"],
        summary: "Push-to-Talk Voice Interaction (Multilingual & Code-Switching)",
        description:
          "Accepts a mobile-produced 16 kHz mono PCM S16LE WAV recording, transcribes via Sarvam Saaras v3 with code-switching support, generates a structured GPT tutor response, synthesizes speech with Sarvam Bulbul v3, saves dialogue to conversation history, and returns synthesized WAV audio + latency metrics.",
        params: {
          type: "object",
          required: ["conversationId"],
          properties: {
            conversationId: { type: "string", format: "uuid", description: "Target conversation ID" },
          },
        },
        consumes: ["multipart/form-data", "application/json"],
        response: {
          200: voiceInteractionResponseDoc,
          400: {
            description: "Bad Request - No audio file or speech detected",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "No speech could be recognized from the audio." },
              errors: { type: "array", items: { type: "object" } },
              meta: { type: "object" },
            },
          },
          404: {
            description: "Conversation or Persona not found",
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string", example: "Conversation not found" },
              errors: { type: "array", items: { type: "object" } },
              meta: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { conversationId } = voiceInteractParamsSchema.parse(request.params);

      // Check if request is multipart
      if (request.isMultipart()) {
        const fileData = await request.file();
        if (!fileData) {
          throw new BadRequestError("No audio file found in multipart form data.");
        }

        const audioBuffer = await fileData.toBuffer();
        const mimeType = fileData.mimetype || "audio/webm";

        const result = await voiceTutorService.processPushToTalk(
          conversationId,
          audioBuffer,
          mimeType
        );

        return reply.code(200).send(
          formatSuccessResponse(request, "Voice interaction processed successfully", result)
        );
      }

      // Fallback if JSON body was posted
      const body = textInteractBodySchema.parse(request.body);
      const result = await voiceTutorService.processTextInteraction(
        conversationId,
        body.text ?? `Selected option: ${body.optionLabel ?? ""}`,
        { overrideVoiceId: body.voiceId }
      );

      return reply.code(200).send(
        formatSuccessResponse(request, "Voice interaction processed successfully", result)
      );
    }
  );

  // POST /api/v1/voice-tutor/conversations/:conversationId/text-interact (Direct Text Testing)
  fastify.post(
    "/conversations/:conversationId/text-interact",
    {
      schema: {
        tags: ["Voice Tutor"],
        summary: "Text-based Tutor Interaction with TTS",
        description:
          "Submit text directly to the English tutor pipeline, generating a structured tutor turn and synthesized speech audio.",
        params: {
          type: "object",
          required: ["conversationId"],
          properties: {
            conversationId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            text: { type: "string", example: "Hello! I went to market aur maine new shoes khareede." },
            voiceId: { type: "string", example: "alloy" },
            activityId: { type: "string", description: "Required with optionId and optionLabel for an MCQ selection." },
            optionId: { type: "string", description: "Stable option ID from turn.activity.options." },
            optionLabel: { type: "string", description: "The visible selected option label." },
          },
        },
        response: {
          200: voiceInteractionResponseDoc,
        },
      },
    },
    async (request, reply) => {
      const { conversationId } = voiceInteractParamsSchema.parse(request.params);
      const body = textInteractBodySchema.parse(request.body);

      const result = await voiceTutorService.processTextInteraction(
        conversationId,
        body.text ?? `Selected option: ${body.optionLabel ?? ""}`,
        { overrideVoiceId: body.voiceId }
      );

      return reply.code(200).send(
        formatSuccessResponse(request, "Interaction completed successfully", result)
      );
    }
  );

  // GET /api/v1/voice-tutor/conversations/:conversationId/ws (Real-Time Bidirectional Voice & Streaming WS Gateway)
  fastify.get(
    "/conversations/:conversationId/ws",
    { websocket: true },
    (socket, request) => {
      const { conversationId } = request.params as { conversationId: string };
      let isCancelled = false;

      socket.send(JSON.stringify({ type: "ready", conversationId }));

      socket.on("message", async (rawMessage: Buffer | string) => {
        try {
          let payload: any = null;
          let isBinaryAudio = false;
          let audioBuffer: Buffer | null = null;

          if (Buffer.isBuffer(rawMessage)) {
            // Check if binary frame is RIFF WAV audio
            if (rawMessage.length >= 4 && rawMessage.toString("utf8", 0, 4) === "RIFF") {
              isBinaryAudio = true;
              audioBuffer = rawMessage;
            } else {
              try {
                payload = JSON.parse(rawMessage.toString("utf8"));
              } catch {
                isBinaryAudio = true;
                audioBuffer = rawMessage;
              }
            }
          } else if (typeof rawMessage === "string") {
            try {
              payload = JSON.parse(rawMessage);
            } catch {
              payload = { type: "text", text: rawMessage };
            }
          }

          if (payload?.type === "interrupt" || payload?.type === "cancel") {
            isCancelled = true;
            socket.send(JSON.stringify({ type: "interrupted" }));
            return;
          }

          isCancelled = false;

          let input: { type: "audio"; buffer: Buffer } | { type: "text"; text: string };
          if (isBinaryAudio && audioBuffer) {
            input = { type: "audio", buffer: audioBuffer };
          } else if (payload?.type === "audio" && payload?.audioBase64) {
            input = { type: "audio", buffer: Buffer.from(payload.audioBase64, "base64") };
          } else if (payload?.type === "text" && payload?.text) {
            input = { type: "text", text: payload.text };
          } else {
            return;
          }

          socket.send(JSON.stringify({ type: "turn_started" }));

          const result = await voiceTutorService.processStreamingInteraction({
            conversationId,
            input,
            overrideVoiceId: payload?.voiceId,
            isCancelled: () => isCancelled,
            onTranscript: (transcript) => {
              if (isCancelled) return;
              socket.send(JSON.stringify({ type: "stt_transcript", text: transcript }));
            },
            onTextDelta: (delta) => {
              if (isCancelled) return;
              socket.send(JSON.stringify({ type: "assistant_delta", delta }));
            },
            onAudioChunk: (chunk) => {
              if (isCancelled) return;
              socket.send(
                JSON.stringify({
                  type: "audio_chunk",
                  index: chunk.index,
                  audioBase64: chunk.audioBase64,
                  format: chunk.format,
                  text: chunk.text,
                })
              );
            },
          });

          if (result && !isCancelled) {
            socket.send(
              JSON.stringify({
                type: "turn_completed",
                userTranscript: result.userTranscript,
                turn: result.turn,
                userMessageId: result.userMessageId,
                assistantMessageId: result.assistantMessageId,
                latencyMetrics: result.latencyMetrics,
              })
            );
          }
        } catch (err: any) {
          socket.send(
            JSON.stringify({
              type: "error",
              code: err.code || "INTERACTION_ERROR",
              message: err.message || "Failed to process interaction",
            })
          );
        }
      });
    }
  );
};
