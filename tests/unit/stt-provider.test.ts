import { describe, expect, it } from "bun:test";
import { SarvamSTTProvider } from "@/shared/ai/stt.adapter.ts";

describe("SarvamSTTProvider", () => {
  it("sends WAV audio to Saaras v3 in codemix mode with automatic language detection", async () => {
    let request: any;
    const provider = new SarvamSTTProvider({
      transcribe: async (value) => {
        request = value;
        return {
          transcript: "Hi ఎలా ఉన్నావు? What is your name?",
          language_code: "te-IN",
          language_probability: 0.96,
        };
      },
    });

    const audio = Buffer.from("wav-data");
    const result = await provider.transcribe(audio, "audio/wav");

    expect(request).toEqual({
      file: {
        data: audio,
        filename: "utterance.wav",
        contentType: "audio/wav",
        contentLength: audio.length,
      },
      model: "saaras:v3",
      language_code: "unknown",
      mode: "codemix",
      input_audio_codec: "wav",
    });
    expect(result).toEqual({
      text: "Hi ఎలా ఉన్నావు? What is your name?",
      languageCode: "te-IN",
      confidence: 0.96,
    });
  });

  it("preserves the provider's mixed-script transcript without repair", async () => {
    const provider = new SarvamSTTProvider({
      transcribe: async () => ({ transcript: "Hi ఎలా ఉన్నావు? ఏం చేస్తున్నావు? What is your name?" }),
    });

    const result = await provider.transcribe(Buffer.from("wav-data"), "audio/wav");

    expect(result.text).toBe("Hi ఎలా ఉన్నావు? ఏం చేస్తున్నావు? What is your name?");
  });

  it("rejects an empty audio buffer before calling Sarvam", async () => {
    let called = false;
    const provider = new SarvamSTTProvider({
      transcribe: async () => {
        called = true;
        return { transcript: "" };
      },
    });

    await expect(provider.transcribe(Buffer.alloc(0), "audio/wav")).rejects.toThrow("empty audio buffer");
    expect(called).toBe(false);
  });
});
