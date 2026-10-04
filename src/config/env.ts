import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/tutor_db"),

  // Sarvam Saaras v3 STT
  SARVAM_API_KEY: z.string().optional(),

  // OpenAI GPT tutor responses
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_MAX_COMPLETION_TOKENS: z.coerce.number().int().min(96).max(2048).default(350),

  // Sarvam Bulbul v3 speech synthesis
  SARVAM_TTS_MODEL: z.string().default("bulbul:v3"),
  SARVAM_TTS_SPEAKER: z.string().default("shubh"),
  SARVAM_TTS_LANGUAGE: z.string().default("te-IN"),
  MAX_TTS_INPUT_CHARS: z.coerce.number().int().positive().default(1000),
  MAX_TTS_AUDIO_BYTES: z.coerce.number().int().positive().default(5000000),
  TTS_TIMEOUT_MS: z.coerce.number().int().min(1000).max(20000).default(8000),
  MIN_AUDIO_INPUT_BYTES: z.coerce.number().int().min(1).max(100000).default(4096),

  // Storage & Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"),

  // Authentication & JWT
  JWT_SECRET: z.string().default("tutor-jwt-secret-key-super-secure-production-2026"),
  JWT_EXPIRES_IN: z.string().default("30d"),

  // Email Notifications (SMTP / Provider)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_FROM: z.string().default("AI English Tutor <support@tutor.app>"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
