import { SarvamAIClient } from "sarvamai";

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
}

export interface STTProvider {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: STTOptions
  ): Promise<STTTranscriptionResult>;
}

type SarvamTranscriptionRequest = {
  file: {
    data: Buffer;
    filename: string;
    contentType: string;
    contentLength: number;
  };
  model: "saaras:v3";
  language_code: "unknown";
  mode: "codemix";
  input_audio_codec: "wav";
};

type SarvamTranscriptionResponse = {
  transcript: string;
  language_code?: string;
  language_probability?: number;
};

type TranscribeRequest = (request: SarvamTranscriptionRequest) => Promise<SarvamTranscriptionResponse>;

export class SarvamSTTProvider implements STTProvider {
  private readonly transcribeRequest: TranscribeRequest;

  constructor(options?: { apiKey?: string; transcribe?: TranscribeRequest }) {
    if (options?.transcribe) {
      this.transcribeRequest = options.transcribe;
      return;
    }

    const client = new SarvamAIClient({
      apiSubscriptionKey: options?.apiKey || env.SARVAM_API_KEY || "",
    });

    this.transcribeRequest = (request) => client.speechToText.transcribe(request);
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    _options?: STTOptions,
  ): Promise<STTTranscriptionResult> {
    if (!audioBuffer.length) {
      throw new Error("Cannot transcribe an empty audio buffer");
    }

    const contentType = mimeType || "audio/wav";
    devLogger.info("STT:Sarvam", "Sending WAV audio to Saaras v3", {
      bytes: audioBuffer.length,
      contentType,
      model: "saaras:v3",
      mode: "codemix",
    });

    const response = await this.transcribeRequest({
      file: {
        data: audioBuffer,
        filename: "utterance.wav",
        contentType,
        contentLength: audioBuffer.length,
      },
      model: "saaras:v3",
      language_code: "unknown",
      mode: "codemix",
      input_audio_codec: "wav",
    });

    const transcript = response.transcript.trim();
    devLogger.info("STT:Sarvam", "Received Saaras transcript", {
      transcript,
      languageCode: response.language_code,
      languageProbability: response.language_probability,
    });

    return {
      text: transcript,
      languageCode: response.language_code,
      confidence: response.language_probability,
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
  return new SarvamSTTProvider();
}
