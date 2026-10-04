# Tutor voice-stack migration plan

## Scope

This is a pre-staging migration. There is no production or staging data that must remain backward-compatible. The implementation can remove obsolete provider code, database fields, migrations, tests, and configuration aggressively.

The target stack is:

- Mobile capture: raw PCM S16LE, 16 kHz, mono.
- Upload container: WAV containing PCM S16LE frames. The WAV header is only a transport/container header; the audio payload remains PCM S16LE.
- STT: Sarvam Saaras v3.
- STT mode: `codemix`.
- STT language: `unknown` so the provider can identify mixed Indian-language/English speech.
- LLM: one GPT model, configured centrally.
- TTS: Sarvam Bulbul v3.
- Mobile playback: provider-returned audio through the existing base64 playback path.

The expected voice path is:

```text
AudioStream (16 kHz / mono / int16)
  -> collect PCM chunks
  -> create WAV PCM S16LE payload
  -> multipart upload
  -> Saaras v3 codemix transcription
  -> validated GPT tutor turn
  -> Bulbul v3 synthesis
  -> base64 audio response
  -> mobile playback
```

This plan intentionally does not preserve the old provider contracts. Existing code that only exists for the old STT, Gemma, Omnivoice, transcript repair, or two-pass audio flow should be deleted.

## Audio contract

The mobile/backend boundary must use these values:

```text
container: WAV
codec/payload: PCM signed 16-bit little-endian (S16LE)
sample rate: 16000 Hz
channels: 1 (mono)
upload MIME: audio/wav
```

Expo's requested sample rate is not an absolute hardware guarantee. The mobile implementation must inspect the actual `AudioStream` sample rate and channel count. The backend must not label a buffer as 16 kHz if the device delivered another rate.

If a device cannot produce exactly 16 kHz mono PCM, the request should fail clearly during development/device validation. A backend resampling fallback is a later decision, not part of the initial clean path.

## Pass 1 — Freeze the contract

Create the small shared contract definitions used by the mobile uploader and backend STT boundary. Document the target format and provider parameters. Do not change recording or provider behavior in this pass.

Exit criteria:

- Both repositories name the same PCM/WAV contract.
- The API upload MIME is defined as `audio/wav` for the new path.
- No Sarvam key is exposed to the mobile application.
- No provider implementation is changed yet.

## Pass 2 — Replace mobile recording with PCM capture

Replace `useAudioRecorder()` file recording with Expo `AudioStream` configured for:

```ts
{
  sampleRate: 16000,
  channels: 1,
  encoding: "int16",
}
```

Collect buffers while the push-to-talk button is held, verify the actual stream metadata, assemble a WAV header plus PCM frames, write a temporary `.wav` file, and upload it.

Remove the current M4A/MP3 extension guessing. Upload `audio/wav` explicitly.

Keep the existing permission, duration, haptic, and retry behavior.

Exit criteria:

- iOS and Android produce playable WAV files.
- WAV data is mono, S16LE, and actually 16 kHz on supported devices.
- Uploads use `audio/wav`.
- No audio chunks or base64 audio are written to logs.

## Pass 3 — Replace STT with Saaras v3

Replace the custom Indic STT HTTP adapter with the official `sarvamai` JavaScript SDK.

Use:

```ts
model: "saaras:v3"
language_code: "unknown"
mode: "codemix"
sample_rate: 16000
```

The adapter should only:

1. Receive the uploaded WAV buffer.
2. Create the SDK file input.
3. Call Saaras once.
4. Return the transcript and provider metadata needed by the turn flow.

Delete old endpoint construction, legacy auth-header variants, old model settings, OpenAI-shaped STT fields, and response-shape guessing.

## Pass 4 — Replace LLM and TTS providers

Replace Gemma with the configured GPT model. Replace Omnivoice with Sarvam Bulbul v3.

Keep product behavior:

- persona prompts
- recent conversation context
- structured tutor-turn validation
- activity policy
- MCQ validation
- deterministic fallback
- speech derivation from approved screen fields

Delete provider-specific behavior:

- Gemma environment variables and endpoint assumptions
- Omnivoice endpoint probing
- old voice IDs
- alternate auth headers
- two-pass TTS
- audio concatenation

Bulbul should receive one validated speech string per turn and return one audio payload.

## Pass 5 — Delete compensating audio/transcript code

Delete the old STT repair subsystem:

- transcript sanitizer
- Indic script repair
- loanword maps
- proper-noun maps
- phonetic code-mix repair
- normalization trace generation

Keep only generic transcript handling:

- empty transcript rejection
- trimming
- Unicode NFC normalization if still needed
- script detection used by tutor policy

Delete the old FFmpeg conversion and RMS filtering path if Pass 2 proves that mobile delivers valid 16 kHz mono PCM consistently. Do not keep an unused conversion fallback “just in case.”

## Pass 6 — Simplify persistence and API contracts

There is no production compatibility requirement. Remove fields that only support the old pipeline, including normalization traces and provider-specific metadata.

Keep only the canonical learner transcript, tutor response data, latency metrics, and audio response fields required by the current mobile app.

Regenerate the clean database migration rather than preserving compatibility migrations for unreleased schema versions.

Remove obsolete environment variables from `.env.example`, runtime validation, and documentation.

## Pass 7 — Rewrite tests and device validation

Delete tests for removed providers and removed normalization behavior.

Add focused tests for:

- WAV header and PCM S16LE construction
- sample-rate/channel validation
- Saaras request options
- codemix transcript preservation
- GPT structured response validation
- Bulbul audio decoding
- complete/failed voice-turn lifecycle
- mobile upload MIME and playback format

Run real-device tests on iOS and Android for Telugu, English, Telugu-English code-mixing, silence, short recordings, and background noise.

## Pass 8 — Final deletion and verification

Remove dead imports, interfaces, factories, mocks, README references, old fixtures, and stale logs. Verify that no old provider names or normalization modules remain.

Run:

```text
backend: bun test
mobile: bunx tsc --noEmit
mobile: bunx expo lint
```

Perform one final end-to-end voice turn on both platforms.

## Realistic effort

- Minimum aggressive implementation: 6 passes.
- Recommended clean implementation: 7 passes.
- Full cleanup with final deletion/review: 8 passes.

The recommended target is 7 passes, with Pass 8 reserved for final deletion and verification rather than new architecture.
