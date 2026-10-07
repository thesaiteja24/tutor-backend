import { env } from "@/config/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";

export interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  format: "mp3" | "wav" | "opus";
}

export interface TTSProvider {
  synthesize(text: string, speaker?: string, languageCode?: string): Promise<TTSResult>;
}

// Fallback mapping for legacy voice IDs / aliases
const LEGACY_VOICE_MAP: Record<string, string> = {
  priya: "b72c4802",
  maya: "b72c4802",
  shubh: "demo0001",
  leo: "demo0001",
  ritu: "7fcf2618",
  emma: "7fcf2618",
  aditya: "68895820",
  david: "68895820",
};

export class OmnivoiceTTSProvider implements TTSProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultVoiceId: string;
  private readonly audioCache = new Map<string, TTSResult>();
  private readonly maxCacheSize = 250;

  constructor(options?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    defaultVoiceId?: string;
  }) {
    this.baseUrl = (options?.baseUrl || env.OMNIVOICE_TTS_ENDPOINT_URL || "https://omnivoice.codegnan.ai").replace(/\/+$/, "");
    this.apiKey = options?.apiKey || env.OMNIVOICE_TTS_API_KEY || "";
    this.model = options?.model || env.OMNIVOICE_TTS_MODEL || "omnivoice";
    this.defaultVoiceId = options?.defaultVoiceId || env.OMNIVOICE_TTS_DEFAULT_VOICE_ID || "b72c4802";
  }

  private get endpoint(): string {
    return `${this.baseUrl}/v1/audio/speech`;
  }

  private resolveVoiceId(speaker?: string): string {
    if (!speaker || speaker === "default") {
      return this.defaultVoiceId;
    }
    const lower = speaker.toLowerCase();
    if (LEGACY_VOICE_MAP[lower]) {
      return LEGACY_VOICE_MAP[lower];
    }
    return speaker;
  }

  clearCache() {
    this.audioCache.clear();
  }

  async synthesize(text: string, speaker?: string, languageCode?: string): Promise<TTSResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error("Cannot synthesize empty text");
    }

    const voice = this.resolveVoiceId(speaker);
    const cacheKey = `${this.model}:${voice}:${languageCode || "auto"}:${cleanText}`;

    if (this.audioCache.has(cacheKey)) {
      devLogger.info("TTS:Omnivoice", "Audio cache HIT for phrase", { text: cleanText, voice });
      return this.audioCache.get(cacheKey)!;
    }

    devLogger.info("TTS:Omnivoice", `Sending text to Omnivoice TTS (${this.endpoint})`, {
      model: this.model,
      voice,
      languageCode,
      textLength: cleanText.length,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      const key = this.apiKey.replace(/^Bearer\s+/i, "").trim();
      headers.Authorization = `Bearer ${key}`;
    }

    const payload: Record<string, unknown> = {
      model: this.model,
      input: cleanText,
      voice,
      response_format: "mp3",
    };
    if (languageCode) {
      payload.language = languageCode.split("-")[0]?.toLowerCase();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.TTS_TIMEOUT_MS || 12000);

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      devLogger.error("TTS:Omnivoice", `Omnivoice request failed or timed out: ${String(fetchErr)}`);
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      devLogger.error("TTS:Omnivoice", `Omnivoice TTS failed (${response.status}): ${errorText}`, null, {
        status: response.status,
      });
      throw new Error(`Omnivoice TTS failed (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    devLogger.info("TTS:Omnivoice", "Received Omnivoice audio stream", { audioBytes: audioBuffer.length });

    const result: TTSResult = {
      audioBuffer,
      mimeType: "audio/mpeg",
      format: "mp3",
    };

    // Store in LRU cache
    if (this.audioCache.size >= this.maxCacheSize) {
      const oldestKey = this.audioCache.keys().next().value;
      if (oldestKey) this.audioCache.delete(oldestKey);
    }
    this.audioCache.set(cacheKey, result);

    return result;
  }
}

export class MockTTSProvider implements TTSProvider {
  async synthesize(_text: string): Promise<TTSResult> {
    return {
      audioBuffer: Buffer.from("mock-mp3"),
      mimeType: "audio/mpeg",
      format: "mp3",
    };
  }
}

export function createTTSProvider(): TTSProvider {
  return new OmnivoiceTTSProvider();
}
