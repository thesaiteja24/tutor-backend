import { describe, expect, it } from "bun:test";
import { SarvamTTSProvider } from "@/shared/ai/tts.adapter.ts";

describe("SarvamTTSProvider", () => {
  it("sends one validated speech request to Bulbul v3", async () => {
    let request: any;
    const audio = Buffer.from("wav-audio").toString("base64");
    const provider = new SarvamTTSProvider({
      synthesize: async (value) => {
        request = value;
        return { audios: [audio] };
      },
    });

    const result = await provider.synthesize("  నమస్కారం! Welcome.  ", undefined, "te");

    expect(request).toEqual({
      text: "నమస్కారం! Welcome.",
      language_code: "te-IN",
      speaker: "shubh",
      model: "bulbul:v3",
      speech_sample_rate: 24000,
      output_audio_codec: "wav",
    });
    expect(result.audioBuffer).toEqual(Buffer.from("wav-audio"));
    expect(result.mimeType).toBe("audio/wav");
    expect(result.format).toBe("wav");
  });

  it("rejects empty speech before calling Sarvam", async () => {
    let called = false;
    const provider = new SarvamTTSProvider({
      synthesize: async () => {
        called = true;
        return { audios: [] };
      },
    });

    await expect(provider.synthesize("   ")).rejects.toThrow("empty text");
    expect(called).toBe(false);
  });

  it("serves repeated speech phrases directly from in-memory cache without secondary API calls", async () => {
    let callCount = 0;
    const audio = Buffer.from("cached-audio").toString("base64");
    const provider = new SarvamTTSProvider({
      synthesize: async () => {
        callCount += 1;
        return { audios: [audio] };
      },
    });

    const res1 = await provider.synthesize("Very good!", "ritu", "en");
    expect(callCount).toBe(1);
    expect(res1.audioBuffer).toEqual(Buffer.from("cached-audio"));

    // Second call for the same phrase and speaker
    const res2 = await provider.synthesize("  Very good!  ", "ritu", "en");
    expect(callCount).toBe(1); // HIT! No second API call
    expect(res2.audioBuffer).toEqual(Buffer.from("cached-audio"));
  });
});
