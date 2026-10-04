export const VOICE_INPUT_AUDIO = {
  container: "wav",
  mimeType: "audio/wav",
  sampleRate: 16_000,
  channels: 1,
  encoding: "s16le",
  bytesPerSample: 2,
} as const;

export type VoiceInputAudio = typeof VOICE_INPUT_AUDIO;

export type PcmWavInspection = {
  valid: boolean;
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  dataBytes?: number;
  sampleCount?: number;
  rms?: number;
  peak?: number;
  nonZeroRatio?: number;
  reason?: string;
};

export function inspectPcmWav(buffer: Buffer): PcmWavInspection {
  if (buffer.length < 44) return { valid: false, reason: "header_too_short" };
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    return { valid: false, reason: "missing_riff_wave_header" };
  }
  if (buffer.toString("ascii", 12, 16) !== "fmt " || buffer.toString("ascii", 36, 40) !== "data") {
    return { valid: false, reason: "unsupported_wav_chunk_layout" };
  }

  const audioFormat = buffer.readUInt16LE(20);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataBytes = buffer.readUInt32LE(40);
  if (audioFormat !== 1) return { valid: false, channels, sampleRate, bitsPerSample, dataBytes, reason: "not_pcm" };
  if (44 + dataBytes > buffer.length) return { valid: false, channels, sampleRate, bitsPerSample, dataBytes, reason: "truncated_data_chunk" };

  const sampleCount = Math.floor(dataBytes / VOICE_INPUT_AUDIO.bytesPerSample);
  let sumSquares = 0;
  let peak = 0;
  let nonZeroSamples = 0;
  for (let offset = 44; offset + 1 < 44 + dataBytes; offset += 2) {
    const sample = buffer.readInt16LE(offset);
    const absolute = Math.abs(sample);
    if (absolute > peak) peak = absolute;
    if (sample !== 0) nonZeroSamples += 1;
    sumSquares += sample * sample;
  }

  return {
    valid: channels === VOICE_INPUT_AUDIO.channels && sampleRate === VOICE_INPUT_AUDIO.sampleRate && bitsPerSample === 16,
    sampleRate,
    channels,
    bitsPerSample,
    dataBytes,
    sampleCount,
    rms: sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0,
    peak,
    nonZeroRatio: sampleCount ? nonZeroSamples / sampleCount : 0,
    reason: channels !== VOICE_INPUT_AUDIO.channels || sampleRate !== VOICE_INPUT_AUDIO.sampleRate || bitsPerSample !== 16 ? "contract_mismatch" : undefined,
  };
}
