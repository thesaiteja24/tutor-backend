import { describe, expect, it } from "bun:test";

import { IndicSTTProvider } from "@/shared/ai/stt.adapter.ts";

describe("IndicSTTProvider", () => {
  it("rejects an empty audio buffer before calling Indic STT", async () => {
    const provider = new IndicSTTProvider();
    await expect(provider.transcribe(Buffer.alloc(0), "audio/wav")).rejects.toThrow("empty audio buffer");
  });

  it("can be instantiated with custom base URL and API key", () => {
    const provider = new IndicSTTProvider({
      baseUrl: "https://indic.codegnan.ai",
      apiKey: "indic_test_key",
    });
    expect(provider).toBeInstanceOf(IndicSTTProvider);
  });
});
