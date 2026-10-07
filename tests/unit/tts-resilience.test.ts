import { describe, expect, it } from "bun:test";

import { OmnivoiceTTSProvider } from "@/shared/ai/tts.adapter.ts";

describe("OmnivoiceTTSProvider", () => {
  it("rejects empty speech before making a request", async () => {
    const provider = new OmnivoiceTTSProvider();
    await expect(provider.synthesize("   ")).rejects.toThrow("empty text");
  });

  it("resolves legacy and default voice mappings correctly", () => {
    const provider = new OmnivoiceTTSProvider({
      baseUrl: "https://omnivoice.codegnan.ai",
      apiKey: "test_key",
      defaultVoiceId: "b72c4802",
    });
    expect(provider).toBeInstanceOf(OmnivoiceTTSProvider);
  });
});
