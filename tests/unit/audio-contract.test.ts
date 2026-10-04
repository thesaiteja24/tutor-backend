import { describe, expect, it } from "bun:test";

import { inspectPcmWav } from "@/shared/audio/audio-contract.ts";

function createWav(samples: number[], sampleRate = 16000, channels = 1) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(sample, 44 + index * 2));
  return buffer;
}

describe("PCM WAV contract inspection", () => {
  it("recognizes the mobile contract and reports signal statistics", () => {
    const result = inspectPcmWav(createWav([0, 1000, -1000, 0]));
    expect(result.valid).toBe(true);
    expect(result.sampleRate).toBe(16000);
    expect(result.channels).toBe(1);
    expect(result.peak).toBe(1000);
    expect(result.nonZeroRatio).toBe(0.5);
  });

  it("identifies format mismatches and silent payloads", () => {
    const result = inspectPcmWav(createWav([0, 0, 0], 44100, 2));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("contract_mismatch");
    expect(inspectPcmWav(Buffer.from("not wav")).reason).toBe("header_too_short");
  });
});
