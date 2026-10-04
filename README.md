# AI English Communication Tutor - Backend Service

Production-grade Fastify + Bun backend service powering an interactive AI English communication tutor for Indian language speakers (Telugu, Hindi, Tamil, Kannada, etc.).

---

## 🌟 Key Features

1. **Push-to-Talk Voice Interaction Loop**:
   - **Speech-to-Text (STT)**: Sarvam Saaras v3 with automatic language detection and code-mixed transcription.
   - **Audio Input**: Mobile-produced 16 kHz mono PCM S16LE WAV sent directly to STT.
   - **Large Language Model (LLM)**: GPT-based structured tutor responses with native-language scaffolding and English practice.
   - **Text-to-Speech (TTS)**: Sarvam Bulbul v3 synthesis for natural Indian-language and code-mixed speech.

2. **Interactive Practice Activities**:
   - **Multiple Choice Questions (MCQ)**: Assistant `turn.activity.options` provides keyed choices rendered as interactive buttons on mobile.
   - **Read-Aloud Practice**: Assistant `turn.screen.learnerPrompt` provides a targeted English practice sentence.
   - **Bilingual Bridging**:
     - `turn.screen`: Canonical native coaching, English response, and learner prompt for the student UI.
     - `turn.speech`: Approved speech segments sent as one validated string to TTS. (Options are omitted from spoken audio.)

3. **Practice Modes & Personas**:
   - **Speak with Emma**: Friendly, open-ended conversational English practice.
   - **Vocabulary Builder with Emma**: Dedicated vocabulary drills with contextual MCQs and antonym/synonym exercises.

4. **Interactive API Documentation**:
   - **Scalar UI**: Available at `http://localhost:3000/docs` powered by OpenAPI 3.1.0 specifications and `@scalar/fastify-api-reference`.

---

## 🏗️ Tech Stack

- **Runtime**: [Bun](https://bun.com) (v1.3.14+)
- **HTTP Framework**: [Fastify](https://fastify.dev/) v5
- **Database**: PostgreSQL 16 (via Docker `tutor_postgres`)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/)
- **Identifier Standard**: UUIDv7 (RFC 9562 time-sortable identifiers)
- **Validation**: [Zod](https://zod.dev/)
- **Documentation**: OpenAPI 3.1.0 + Scalar UI (`/docs`)

---

## 🚀 Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=3000
DATABASE_URL=postgresql://tutor:tutor_secret@localhost:5432/tutor_db
SARVAM_API_KEY=your_sarvam_api_key
GROQ_API_KEY=your_groq_api_key
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Run Migrations & Seed Database

```bash
bun run db:migrate
bun run db:seed
```

### 4. Start Development Server

```bash
bun run dev
```

Visit the interactive Scalar API documentation at:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**

---

## 📡 API Endpoints Reference

### 1. Voice Tutor (`/api/v1/voice-tutor`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/conversations/:conversationId/interact` | **Push-to-Talk**: Accepts multipart 16 kHz mono PCM S16LE WAV, runs Saaras v3 $\to$ GPT $\to$ Bulbul v3, records messages, and returns WAV audio Base64 plus the tutor turn and latency breakdown. |
| `POST` | `/conversations/:conversationId/text-interact` | Text-based tutor interaction with TTS synthesis. |

### 2. Practice Modes (`/api/v1/personas`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Lists all practice modes (e.g. *Speak with Emma*, *Vocabulary Builder with Emma*) with pagination metadata. |
| `GET` | `/:id` | Get details and coaching prompt for a specific practice mode. |
| `POST` | `/` | Create a custom practice mode with custom system prompt. |
| `PATCH` | `/:id` | Update practice mode name, description, or system prompt. |
| `DELETE`| `/:id` | Delete a practice mode. |

### 3. Conversations (`/api/v1/conversations`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List student conversations with pagination. |
| `GET` | `/:id` | Get conversation details along with full message history (including structured `turn`, `audioUrl`, and `latencyMetrics`). |
| `POST` | `/` | Start a new conversation session linked to a practice mode. |
| `PATCH` | `/:id` | Update conversation title, status, or prompt override. |
| `DELETE`| `/:id` | Soft delete / archive conversation. |

### 4. Users (`/api/v1/users`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/me` | Retrieve current default student profile. |
| `PATCH` | `/me` | Update student profile (native language, English level, display name). |
| `GET` | `/:id` | Get user by UUID. |
| `PATCH` | `/:id` | Update user by UUID. |

### 5. System Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check and uptime. |

---

## 🧪 Testing

Run the full test suite (unit tests and integration tests):

```bash
bun test
```

Test coverage includes:
- Saaras v3 mixed-script transcript handling and PCM WAV input validation.
- End-to-end integration tests for all REST endpoints and error scenarios.
