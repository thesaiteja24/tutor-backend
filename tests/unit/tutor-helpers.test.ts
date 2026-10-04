import { describe, expect, it } from "bun:test";

import {
  buildTutorSystemPrompt,
  createFallbackTutorTurn,
  parseTutorTurnResponse,
  toPublicTutorTurn,
  toTtsSpeechText,
  tutorTurnSchema,
} from "@/shared/ai/tutor.helpers.ts";

describe("tutor helpers & schema", () => {
  it("builds the prompt in the strict 4-layer hierarchy: Persona -> Mode -> Context -> Contract", () => {
    const prompt = buildTutorSystemPrompt({
      personaPrompt: "You are Maya, a witty Gen-Z English tutor.",
      practiceModePrompt: "=== PRACTICE MODE: ROLEPLAY ===\nSimulate realistic conversation.",
      customPrompt: "Ordering coffee at a cafe",
      nativeLanguage: "te",
      englishLevel: "intermediate",
      introducedTerms: ["barista", "espresso"],
    });

    const personaIdx = prompt.indexOf("=== TUTOR IDENTITY & PERSONALITY ===");
    const modeIdx = prompt.indexOf("=== PRACTICE MODE: ROLEPLAY ===");
    const contextIdx = prompt.indexOf("=== LEARNER CONTEXT ===");
    const contractIdx = prompt.indexOf("=== OUTPUT CONTRACT ===");

    expect(personaIdx).toBeGreaterThanOrEqual(0);
    expect(modeIdx).toBeGreaterThan(personaIdx);
    expect(contextIdx).toBeGreaterThan(modeIdx);
    expect(contractIdx).toBeGreaterThan(contextIdx);

    expect(prompt).toContain("Maya, a witty Gen-Z English tutor");
    expect(prompt).toContain("Simulate realistic conversation");
    expect(prompt).toContain("Ordering coffee at a cafe");
    expect(prompt).toContain("Native Language: Telugu (Telugu script (తెలుగు లిపి))");
    expect(prompt).toContain("barista, espresso");
  });

  it("parses valid JSON object with full primitive fields", () => {
    const input = {
      content: "చాలా బాగుంది! Let's choose the best phrase.",
      special: "Focus on formal email greetings.",
      copiable: "Dear Dr. Sharma, I hope this email finds you well.",
      options: [
        { id: 1, text: "Hey Dr. Sharma" },
        { id: 2, text: "Dear Dr. Sharma" },
      ],
      correction: {
        original: "I am wanting help",
        naturalRewrite: "I would like some help",
        explanation: "Use 'would like' instead of 'am wanting'",
      },
      learningState: {
        topic: "Email Etiquette",
        introducedTerms: ["etiquette", "salutation"],
        targetSkill: "grammar",
      },
    };

    const parsed = parseTutorTurnResponse(input);
    expect(parsed.content).toBe(input.content);
    expect(parsed.special).toBe(input.special);
    expect(parsed.copiable).toBe(input.copiable);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.correction?.naturalRewrite).toBe("I would like some help");
    expect(parsed.learningState?.topic).toBe("Email Etiquette");
  });

  it("strips markdown json fences when parsing raw string", () => {
    const jsonStr = "```json\n" + JSON.stringify({
      content: "Great job! Let's continue.",
      special: null,
      copiable: null,
      options: null,
      correction: null,
      learningState: null,
    }) + "\n```";

    const parsed = parseTutorTurnResponse(jsonStr);
    expect(parsed.content).toBe("Great job! Let's continue.");
  });

  it("converts response to public turn format", () => {
    const turn = {
      content: "Awesome!",
      special: "Try saying this aloud",
      copiable: null,
      options: [{ id: 1, text: "Option A" }],
      correction: null,
      learningState: { topic: "Greetings", introducedTerms: ["hello"], targetSkill: "fluency" },
    };

    const pub = toPublicTutorTurn(turn);
    expect(pub.content).toBe("Awesome!");
    expect(pub.special).toBe("Try saying this aloud");
    expect(pub.copiable).toBeNull();
    expect(pub.options).toEqual([{ id: 1, text: "Option A" }]);
    expect(pub.correction).toBeNull();
    expect(pub.learningState?.topic).toBe("Greetings");
  });

  it("extracts clean speech text for TTS", () => {
    const turn = {
      content: "  బాగుంది! How are you doing today?   ",
      special: "Extra prompt",
      copiable: null,
      options: null,
      correction: null,
      learningState: null,
    };

    expect(toTtsSpeechText(turn)).toBe("బాగుంది! How are you doing today?");
  });

  it("provides a resilient fallback turn", () => {
    const fallback = createFallbackTutorTurn();
    expect(() => tutorTurnSchema.parse(fallback)).not.toThrow();
    expect(fallback.content).toContain("Let's keep going");
  });
});
