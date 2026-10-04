import type { TutorTurnResponse } from "./tutor.helpers.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TutorLLMParams {
  personaPrompt: string;
  practiceModePrompt: string;
  customPrompt?: string | null;
  nativeLanguage?: string;
  englishLevel?: string;
  learnerContextPrompt?: string;
  history: ChatMessage[];
  userMessage: string;
  onSentenceChunk?: (sentence: string) => Promise<void> | void;
  onTextDelta?: (delta: string) => Promise<void> | void;
}

export interface LLMProvider {
  generateTutorReply(params: TutorLLMParams): Promise<TutorTurnResponse>;
}

export const TUTOR_TURN_JSON_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description: "Tutor reply in simple, natural English.",
    },
    special: {
      type: ["string", "null"],
      description: "Special exercise instruction or null.",
    },
    copiable: {
      type: ["string", "null"],
      description: "Practice phrase for the learner or null.",
    },
    options: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          text: { type: "string" },
        },
        required: ["id", "text"],
        additionalProperties: false,
      },
      description: "Options for multiple choice exercise or null.",
    },
    correction: {
      type: ["object", "null"],
      properties: {
        original: { type: "string" },
        naturalRewrite: { type: "string" },
        explanation: { type: ["string", "null"] },
      },
      required: ["original", "naturalRewrite"],
      additionalProperties: false,
      description: "Grammar / pronunciation feedback if learner made an error.",
    },
    learningState: {
      type: ["object", "null"],
      properties: {
        topic: { type: ["string", "null"] },
        introducedTerms: {
          type: "array",
          items: { type: "string" },
        },
        targetSkill: { type: ["string", "null"] },
      },
      required: ["introducedTerms"],
      additionalProperties: false,
      description: "Learning state progression metadata.",
    },
  },
  required: ["content", "special", "copiable", "options", "correction", "learningState"],
  additionalProperties: false,
} as const;
