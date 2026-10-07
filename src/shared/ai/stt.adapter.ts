import { env } from "@/config/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";

export interface STTTranscriptionResult {
  text: string;
  durationSeconds?: number;
  confidence?: number;
  languageCode?: string;
}

export interface STTOptions {
  language?: string;
  mode?: "native" | "mixed" | "romanised";
}

export interface STTProvider {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: STTOptions
  ): Promise<STTTranscriptionResult>;
}

type IndicTranscribeResponse = {
  text: string;
  lang?: string;
  mode?: string;
  lid?: unknown;
  audio_seconds?: number;
  processing_seconds?: number;
  real_time_factor?: number;
  chunks?: number;
  model?: string;
  revision?: string;
};

export class IndicSTTProvider implements STTProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (options?.baseUrl || env.INDIC_STT_ENDPOINT_URL || "https://indic.codegnan.ai").replace(/\/+$/, "");
    this.apiKey = options?.apiKey || env.INDIC_STT_API_KEY || "";
  }

  private get endpoint(): string {
    return `${this.baseUrl}/v1/transcribe`;
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: STTOptions,
  ): Promise<STTTranscriptionResult> {
    if (!audioBuffer.length) {
      throw new Error("Cannot transcribe an empty audio buffer");
    }

    const contentType = mimeType || "audio/wav";
    const extension = contentType.includes("mpeg") || contentType.includes("mp3") ? "mp3" : "wav";
    const filename = `recording.${extension}`;

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: contentType });
    formData.append("file", blob, filename);

    if (options?.language) {
      // Normalize language code (e.g., 'te-IN' -> 'te')
      const normalizedLang = options.language.split("-")[0]?.toLowerCase() || options.language;
      formData.append("lang", normalizedLang);
    }
    formData.append("mode", options?.mode || "native");

    devLogger.info("STT:Indic", `Sending audio to Indic STT (${this.endpoint})`, {
      bytes: audioBuffer.length,
      contentType,
      lang: options?.language,
      mode: options?.mode || "native",
      model: env.INDIC_STT_MODEL,
    });

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      const key = this.apiKey.replace(/^Bearer\s+/i, "").trim();
      headers.Authorization = `Bearer ${key}`;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      devLogger.error("STT:Indic", `Indic STT failed (${response.status}): ${errorBody}`, null, {
        status: response.status,
      });
      throw new Error(`Indic STT transcription failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as IndicTranscribeResponse;
    const transcript = (data.text || "").trim();

    devLogger.info("STT:Indic", "Received Indic STT transcript", {
      transcript,
      lang: data.lang,
      audioSeconds: data.audio_seconds,
      processingSeconds: data.processing_seconds,
      rtf: data.real_time_factor,
    });

    return {
      text: transcript,
      languageCode: data.lang,
      durationSeconds: data.audio_seconds,
      confidence: 0.95,
    };
  }
}

export class MockSTT implements STTProvider {
  async transcribe(audioBuffer: Buffer, _mimeType: string): Promise<STTTranscriptionResult> {
    console.log(`[MockSTT] Transcribing audio (${audioBuffer.length} bytes)...`);
    return {
      text: "Hi ఎలా ఉన్నావ్? నా పేరు సాయితేజ.",
      durationSeconds: 2.5,
      confidence: 0.98,
    };
  }
}

export function createSTTProvider(): STTProvider {
  return new IndicSTTProvider();
}
