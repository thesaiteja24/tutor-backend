# Conversation POC fixtures

These fixtures are anonymized observations from the development logs and current POC
database. They are test inputs, not database seed data. Tests must load them without
writing to the shared development database.

Each fixture records the observed input, expected processing behavior, and the
conversation-quality rule it protects. They are intentionally introduced in Pass 0;
they become automated test cases in Passes 3, 4, and 7.

## Fixture index

- `greeting-en.json`: short English greeting; no correction or forced quiz.
- `greeting-code-mixed-te.json`: Telugu-English greeting; preserve intent.
- Provider-returned mixed-script transcripts are preserved as returned by Saaras v3.
- `stt-provider-failure.json`: return retry-safe failure without an active orphan turn.
- `pass7-screen-speech.json`: assistant-output failures that must be canonicalized
  before rendering or synthesis.
- `pass7-transcript-policy.json`: ambiguous script/short-transcript cases requiring
  a neutral clarification rather than an asserted correction.
- `pass7-provider-resilience.json`: recording and TTS provider boundary cases.
- `pass7-mobile-observability.json`: non-audio development logging required to
  verify response/UI/audio parity on a real device.
