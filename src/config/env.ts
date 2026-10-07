import { config } from "dotenv";
import { z } from "zod";

config();

// Process environments contain unrelated OS/CI variables; validate declared app keys
// without rejecting those external variables.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/tutor_db"),

  // Local/deployment database seed credentials. Required by db:seed, not by the API server.
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASS: z.string().min(8).optional(),

  // Indic STT (bodhan-ai/indic-transcribe-core)
  INDIC_STT_ENDPOINT_URL: z.string().default("https://indic.codegnan.ai"),
  INDIC_STT_API_KEY: z.string().default("indic_9321309a4eba4fc988f11c56654d9d606b609b344019d4b3658ac2661d6312e0"),
  INDIC_STT_MODEL: z.string().default("bodhan-ai/indic-transcribe-core"),
  SARVAM_API_KEY: z.string().optional(),

  // Gemma LLM (OpenAI-compatible vLLM)
  GEMMA_LLM_ENDPOINT_URL: z.string().default("https://llm.codegnan.ai/v1"),
  GEMMA_LLM_API_KEY: z.string().default("nx-0e946f6a20e1f127ea7f77ec51d5e791c6307a5a137df873"),
  GEMMA_LLM_MODEL: z.string().default("gemma4"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://llm.codegnan.ai/v1"),
  OPENAI_MODEL: z.string().default("gemma4"),
  OPENAI_MAX_COMPLETION_TOKENS: z.coerce.number().int().min(96).max(4096).default(512),

  // Omnivoice TTS
  OMNIVOICE_TTS_ENDPOINT_URL: z.string().default("https://omnivoice.codegnan.ai"),
  OMNIVOICE_TTS_API_KEY: z.string().default("4210dad602dd0d42d43d367f5dae16033288076b53926489d0df79db30f5ec8c"),
  OMNIVOICE_TTS_MODEL: z.string().default("omnivoice"),
  OMNIVOICE_TTS_DEFAULT_VOICE_ID: z.string().default("b72c4802"),
  SARVAM_TTS_MODEL: z.string().default("omnivoice"),
  SARVAM_TTS_SPEAKER: z.string().default("b72c4802"),
  SARVAM_TTS_LANGUAGE: z.string().default("te"),
  MAX_TTS_INPUT_CHARS: z.coerce.number().int().positive().default(1000),
  MAX_TTS_AUDIO_BYTES: z.coerce.number().int().positive().default(5000000),
  TTS_TIMEOUT_MS: z.coerce.number().int().min(1000).max(20000).default(12000),
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
  ORGANIZATION_REQUEST_REMINDER_INTERVAL_MS: z.coerce.number().int().min(60000).default(60 * 60 * 1000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", z.treeifyError(parsedEnv.error));
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
