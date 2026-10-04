import { SarvamAIClient } from "sarvamai";

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

type SarvamSpeechRequest = {
  text: string;
  language_code: SarvamSpeechLanguage;
  speaker: SarvamSpeechSpeaker;
  model: SarvamSpeechModel;
  speech_sample_rate: 24000;
  output_audio_codec: "wav";
};

type SarvamSpeechLanguage = "bn-IN" | "en-IN" | "gu-IN" | "hi-IN" | "kn-IN" | "ml-IN" | "mr-IN" | "od-IN" | "pa-IN" | "ta-IN" | "te-IN";
type SarvamSpeechSpeaker = "shubh" | "aditya" | "ritu" | "priya" | "neha" | "rahul" | "pooja" | "rohan" | "simran" | "kavya" | "amit" | "dev" | "ishita" | "shreya" | "ratan" | "varun" | "manan" | "sumit" | "roopa" | "kabir" | "aayan" | "ashutosh" | "advait" | "anand" | "tanya" | "tarun" | "sunny" | "mani" | "gokul" | "vijay" | "shruti" | "suhani" | "mohit" | "kavitha" | "rehan" | "soham" | "rupali";
type SarvamSpeechModel = "bulbul:v3" | "bulbul:v2";

type SarvamSpeechResponse = { audios: string[] };
type SynthesizeRequest = (request: SarvamSpeechRequest) => Promise<SarvamSpeechResponse>;

const LANGUAGE_CODES: Record<string, string> = {
  te: "te-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  od: "od-IN",
  en: "en-IN",
};

function toLanguageCode(languageCode?: string): SarvamSpeechLanguage {
  if (!languageCode) return (env.SARVAM_TTS_LANGUAGE || "te-IN") as SarvamSpeechLanguage;
  if (languageCode.includes("-")) return languageCode as SarvamSpeechLanguage;
  return (LANGUAGE_CODES[languageCode.toLowerCase()] || env.SARVAM_TTS_LANGUAGE || "te-IN") as SarvamSpeechLanguage;
}

export class SarvamTTSProvider implements TTSProvider {
  private readonly synthesizeRequest: SynthesizeRequest;
  private readonly audioCache = new Map<string, TTSResult>();
  private readonly maxCacheSize = 250;

  constructor(options?: { apiKey?: string; synthesize?: SynthesizeRequest }) {
    if (options?.synthesize) {
      this.synthesizeRequest = options.synthesize;
      return;
    }

    const client = new SarvamAIClient({
      apiSubscriptionKey: options?.apiKey || env.SARVAM_API_KEY || "",
    });
    this.synthesizeRequest = (request) => client.textToSpeech.convert(request);
  }

  clearCache() {
    this.audioCache.clear();
  }

  async synthesize(text: string, speaker?: string, languageCode?: string): Promise<TTSResult> {
    const cleanText = text.trim();
    if (!cleanText) throw new Error("Cannot synthesize empty text");

    const resolvedSpeaker = (speaker || env.SARVAM_TTS_SPEAKER) as SarvamSpeechSpeaker;
    const resolvedLang = toLanguageCode(languageCode);
    const resolvedModel = (env.SARVAM_TTS_MODEL || "bulbul:v3") as SarvamSpeechModel;

    const cacheKey = `${resolvedModel}:${resolvedSpeaker}:${resolvedLang}:${cleanText}`;
    if (this.audioCache.has(cacheKey)) {
      devLogger.info("TTS:Sarvam", "Audio cache HIT for phrase", { text: cleanText, speaker: resolvedSpeaker });
      return this.audioCache.get(cacheKey)!;
    }

    const request = {
      text: cleanText,
      language_code: resolvedLang,
      speaker: resolvedSpeaker,
      model: resolvedModel,
      speech_sample_rate: 24000 as const,
      output_audio_codec: "wav" as const,
    };

    devLogger.info("TTS:Sarvam", "Sending text to Bulbul v3", {
      model: request.model,
      speaker: request.speaker,
      languageCode: request.language_code,
      textLength: cleanText.length,
    });

    const response = await this.synthesizeRequest(request);
    const audioBase64 = response.audios[0];
    if (!audioBase64) throw new Error("Sarvam TTS returned no audio");

    const audioBuffer = Buffer.from(audioBase64, "base64");
    devLogger.info("TTS:Sarvam", "Received Bulbul audio", { audioBytes: audioBuffer.length });

    const result: TTSResult = {
      audioBuffer,
      mimeType: "audio/wav",
      format: "wav",
    };

    // Store in cache (LRU eviction if at capacity)
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
      audioBuffer: Buffer.from("mock-wav"),
      mimeType: "audio/wav",
      format: "wav",
    };
  }
}

export function createTTSProvider(): TTSProvider {
  return new SarvamTTSProvider();
}
