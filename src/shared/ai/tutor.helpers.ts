import { z } from "zod";

export const tutorTurnOptionSchema = z.union([
  z.string().trim().min(1).max(200).transform((text) => ({ id: 0, text })),
  z.strictObject({
    id: z.union([z.number().int().positive(), z.string().trim().min(1).max(100)]),
    text: z.string().trim().min(1).max(200),
  }),
]);

export const tutorTurnSchema = z.strictObject({
  content: z.string().trim().min(1).max(2000),
  special: z.string().trim().max(2000).nullable().optional(),
  copiable: z.string().trim().max(5000).nullable().optional(),
  options: z
    .array(tutorTurnOptionSchema)
    .transform((opts) => opts.map((opt, i) => ({ id: opt.id || i + 1, text: opt.text })))
    .nullable()
    .optional(),
  correction: z
    .strictObject({
      original: z.string().trim().min(1).max(500),
      naturalRewrite: z.string().trim().min(1).max(500),
      explanation: z.string().trim().max(1000).nullable().optional(),
    })
    .nullable()
    .optional(),
  learningState: z
    .strictObject({
      topic: z.string().trim().max(200).nullable().optional(),
      introducedTerms: z.array(z.string()).default([]),
      targetSkill: z.string().trim().max(100).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type TutorTurnResponse = z.infer<typeof tutorTurnSchema>;

export interface PublicTutorTurn {
  content: string;
  special?: string | null;
  copiable?: string | null;
  options?: Array<{ id: number | string; text: string }> | null;
  correction?: {
    original: string;
    naturalRewrite: string;
    explanation?: string | null;
  } | null;
  learningState?: {
    topic?: string | null;
    introducedTerms: string[];
    targetSkill?: string | null;
  } | null;
}

export interface BuildPromptParams {
  personaPrompt: string;
  practiceModePrompt?: string;
  customPrompt?: string | null;
  nativeLanguage?: string;
  englishLevel?: string;
  introducedTerms?: string[];
  learnerContextPrompt?: string;
}

export const RESPONSE_CONTRACT = `You must return valid JSON matching this schema:
{
  "content": "Punchy, natural conversational spoken response (strictly 1 to 2 short sentences, max 28 words). Code-mixed naturally with native language in native script and English words in English alphabet. Always ends with an active conversational hook or prompt for the learner to speak.",
  "special": "Optional focused scenario challenge or prompt (or null).",
  "copiable": "Optional reusable text snippet, email template, or key phrase for the learner to copy (or null).",
  "options": [
    { "id": 1, "text": "Option 1" },
    { "id": 2, "text": "Option 2" }
  ],
  "correction": {
    "original": "Learner sentence with error",
    "naturalRewrite": "Polished phrasing",
    "explanation": "Brief gentle tip"
  },
  "learningState": {
    "topic": "Current topic",
    "introducedTerms": ["term1"],
    "targetSkill": "fluency|grammar|vocabulary|pronunciation"
  }
}
Rules:
- Length: Strictly 1 to 2 short sentences in 'content' (under 28 words total). Keep it ultra-punchy and conversational.
- Natural Code-Mixing:
  * Native language words MUST be written in their authentic native script (e.g. Telugu in Telugu script, Hindi in Devanagari script).
  * Common English terms and concepts MUST stay in English (e.g. 'English tutor', 'practice', 'grammar', 'vocabulary', 'sentence', 'email drafting', 'ready', 'Let's get started'). DO NOT artificially translate these into awkward native words (e.g. never say 'వ్యాకరణ మీటరు').
  * Do NOT transliterate native words into English letters.
- Active Learner Participation:
  * NEVER give long lectures or monologues.
  * Every single response MUST invite or prompt the learner to speak (e.g. 'Now your turn! How would you say that?', 'ఇప్పుడు మీరు try చేయండి: ...', 'What would you order next?').
- Language Purity: Use ONLY the learner's chosen native language. NEVER mix Hindi words into Telugu/Tamil/Kannada/Malayalam sessions.
- No Emojis: Strictly DO NOT include any emojis (no 👋, 😊, 🚀, ✨, etc.) anywhere in any field.
- Zero JSON Bloat: Set 'options', 'special', and 'copiable' to null by default unless explicitly relevant to the current turn.
- Only include 'correction' when the learner made a clear grammar or phrasing slip that benefits from gentle recasting.
- Set unneeded fields to null.`;

export interface LanguageConfig {
  name: string;
  scriptName: string;
  samplePhrases: string;
  goodExample: string;
  strictBan: string;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  te: {
    name: "Telugu",
    scriptName: "Telugu script (తెలుగు లిపి)",
    samplePhrases: "'చాలా బాగుంది!', 'దీని meaning ఏంటంటే...', 'ఇప్పుడు మీరు try చేయండి', 'ఖచ్చితంగా!'",
    goodExample: "Hi! Today let's practice a useful phrase: 'get the ball rolling'. దీని meaning ఏంటంటే ఏదైనా work start చేయడం. Now you try! Say: 'Let's get the ball rolling' out loud!",
    strictBan: "NEVER use Hindi words (like 'aap', 'kya', 'hai', 'chalo', 'bhai', 'shuru', 'karna'). Use ONLY genuine Telugu words in Telugu script.",
  },
  hi: {
    name: "Hindi",
    scriptName: "Devanagari script (देवनागरी लिपि)",
    samplePhrases: "'बहुत बढ़िया!', 'इसका meaning है...', 'अब आप try कीजिए', 'बिल्कुल!'",
    goodExample: "Hi! Today let's learn a useful phrase: 'get the ball rolling'. इसका meaning होता है किसी काम को start करना. Now you try! Say: 'Let's get the ball rolling' out loud!",
    strictBan: "Write Hindi words in Devanagari script.",
  },
  ta: {
    name: "Tamil",
    scriptName: "Tamil script (தமிழ் எழுத்துக்கள்)",
    samplePhrases: "'ரொம்ப நல்லா இருக்கு!', 'இதோட meaning என்னன்னா...', 'இப்போ நீங்க try பண்ணுங்க', 'கண்டிப்பா!'",
    goodExample: "Hi! Today let's practice a phrase: 'get the ball rolling'. இதோட meaning ஒரு வேலையை start பண்றது. Now you try! Say: 'Let's get the ball rolling' out loud!",
    strictBan: "NEVER use Hindi words (like 'aap', 'kya', 'hai', 'chalo', 'bhai'). Use ONLY genuine Tamil words in Tamil script.",
  },
  kn: {
    name: "Kannada",
    scriptName: "Kannada script (ಕನ್ನಡ ಲಿಪಿ)",
    samplePhrases: "'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ!', 'ಇದರ meaning ಏನಂದ್ರೆ...', 'ಈಗ ನೀವು try ಮಾಡಿ', 'ಖಂಡಿತ!'",
    goodExample: "Hi! Today let's learn a phrase: 'get the ball rolling'. ಇದರ meaning ಯಾವುದೇ work start ಮಾಡುವುದು. Now you try! Say: 'Let's get the ball rolling' out loud!",
    strictBan: "NEVER use Hindi words (like 'aap', 'kya', 'hai', 'chalo', 'bhai'). Use ONLY genuine Kannada words in Kannada script.",
  },
  ml: {
    name: "Malayalam",
    scriptName: "Malayalam script (മലയാളം ലിപി)",
    samplePhrases: "'വളരെ നല്ലത്!', 'ഇതിന്റെ meaning എന്താണെന്നാൽ...', 'ഇപ്പോൾ നിങ്ങൾ try ചെയ്യൂ', 'തീർച്ചയായും!'",
    goodExample: "Hi! Today let's learn a phrase: 'get the ball rolling'. ഇതിന്റെ meaning ഒരു work start ചെയ്യുക എന്നാണ്. Now you try! Say: 'Let's get the ball rolling' out loud!",
    strictBan: "NEVER use Hindi words (like 'aap', 'kya', 'hai', 'chalo', 'bhai'). Use ONLY genuine Malayalam words in Malayalam script.",
  },
  en: {
    name: "English",
    scriptName: "English Latin alphabet",
    samplePhrases: "'Great job!', 'Now you try', 'Let's practice!'",
    goodExample: "Hi! Today let's practice a phrase: 'get the ball rolling'. It means to start an activity or process. Now you try! Say: 'Let's get the ball rolling' out loud!",
    strictBan: "Speak in natural, friendly English.",
  },
};

export function buildTutorSystemPrompt(params: BuildPromptParams): string {
  const sections: string[] = [];
  const nativeLangCode = (params.nativeLanguage || "te").toLowerCase();
  const lang = LANGUAGE_CONFIGS[nativeLangCode] || LANGUAGE_CONFIGS.te!;
  const level = params.englishLevel || "intermediate";

  // Dynamic ratio per level
  const languageRatio =
    level === "beginner"
      ? `65% English, 35% ${lang.name} in ${lang.scriptName}`
      : level === "advanced"
        ? `95% Fluent English, 5% ${lang.name} in ${lang.scriptName}`
        : `85% English Immersion, 15% ${lang.name} in ${lang.scriptName}`;

  // 1. Persona (Character Voice & Presence)
  sections.push(`=== TUTOR IDENTITY & PERSONALITY ===\n${params.personaPrompt.trim()}`);

  // 2. Practice Mode & Priority Objective (Loaded directly from practice_modes entity)
  if (params.practiceModePrompt?.trim()) {
    sections.push(params.practiceModePrompt.trim());
  }

  // 3. Natural Spoken English & Native Scaffolding Rules
  sections.push(
    `=== LANGUAGE & INTERACTION RULES ===
- Primary Language Ratio: ${languageRatio}
- Spoken Style:
  * The main conversational flow, questions, and sentences MUST be in natural Spoken English.
  * Use ${lang.name} in authentic ${lang.scriptName} strictly for warm explanations, encouragement, and scaffolding (e.g. ${lang.samplePhrases}).
  * NEVER translate English heavily into archaic or formal native words (e.g. do NOT say 'నేను మీతో పదాన్ని పంచుకోవాలని ఉంది' or 'వ్యాకరణ మీటరు').
  * Example of good conversational flow: "${lang.goodExample}"
- Active Learner Participation on EVERY Turn:
  * Do NOT give passive lectures or one-sided definitions.
  * Every single response MUST actively prompt the learner to speak or reply (e.g. "Now you try! Say...", "What would you say next?", "Try using it in a sentence!").
- Strict Language Purity: ${lang.strictBan}
- Turn Length: Strictly 1 to 2 short sentences per turn (max 28 words).
- Emojis Prohibited: NEVER output any emojis (no 👋, 🖐️, 😊, ✨, etc.) in any response field.`,
  );

  // 4. Conversational Continuity & Dynamic Language Adaptation
  sections.push(
    `=== CONVERSATIONAL CONTINUITY & ANTI-DESYNC ===
- Acknowledge and evaluate the learner's response to your previous prompt.
- Do NOT reset the scenario, do NOT re-introduce yourself, and do NOT change the topic abruptly.
- Advance the conversation naturally to the next turn.
- If the learner's native language changes mid-session, smoothly transition your code-mixed tips and explanations into the new language (${lang.name} in ${lang.scriptName}) while maintaining context.`,
  );

  // 5. Learner Profile & Context
  const terms = params.introducedTerms?.length
    ? `\nPreviously introduced terms: ${params.introducedTerms.join(", ")}`
    : "";
  const custom = params.customPrompt ? `\nAdditional Session Context: ${params.customPrompt}` : "";

  sections.push(
    `=== LEARNER CONTEXT ===\nNative Language: ${lang.name} (${lang.scriptName})\nEnglish Proficiency Level: ${level}${custom}${terms}`,
  );

  // 6. Response Contract
  sections.push(`=== OUTPUT CONTRACT ===\n${RESPONSE_CONTRACT}`);

  return sections.join("\n\n");
}

export function sanitizeEmojis(text: string): string {
  return text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F?/gu, "").trim();
}

export function toPublicTutorTurn(turn: TutorTurnResponse): PublicTutorTurn {
  return {
    content: sanitizeEmojis(turn.content),
    special: turn.special ? sanitizeEmojis(turn.special) : null,
    copiable: turn.copiable ? sanitizeEmojis(turn.copiable) : null,
    options: turn.options?.length
      ? turn.options.map((opt) => ({ id: opt.id, text: sanitizeEmojis(opt.text) }))
      : null,
    correction: turn.correction?.naturalRewrite
      ? {
        original: sanitizeEmojis(turn.correction.original),
        naturalRewrite: sanitizeEmojis(turn.correction.naturalRewrite),
        explanation: turn.correction.explanation ? sanitizeEmojis(turn.correction.explanation) : null,
      }
      : null,
    learningState: turn.learningState
      ? {
        topic: turn.learningState.topic || null,
        introducedTerms: turn.learningState.introducedTerms || [],
        targetSkill: turn.learningState.targetSkill || null,
      }
      : null,
  };
}

export function toTtsSpeechText(turn: TutorTurnResponse): string {
  return sanitizeEmojis(turn.content)
    .replace(/[*_#`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripJsonFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function parseTutorTurnResponse(data: unknown): TutorTurnResponse {
  let parsed: unknown;
  if (typeof data === "string") {
    parsed = JSON.parse(stripJsonFence(data));
  } else {
    parsed = data;
  }
  const validated = tutorTurnSchema.parse(parsed);
  validated.content = sanitizeEmojis(validated.content);
  if (validated.special) validated.special = sanitizeEmojis(validated.special);
  if (validated.copiable) validated.copiable = sanitizeEmojis(validated.copiable);
  return validated;
}

export function createFallbackTutorTurn(): TutorTurnResponse {
  return {
    content: "Chala bagundi! Let's keep going. Could you tell me more about that?",
    special: null,
    copiable: null,
    options: null,
    correction: null,
    learningState: {
      topic: null,
      introducedTerms: [],
      targetSkill: "fluency",
    },
  };
}

export function validationSummary(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    return (error as { issues: Array<{ path?: Array<string | number>; message?: string }> }).issues
      .map((issue) => `${issue.path?.join(".") || "root"}: ${issue.message || "invalid"}`)
      .join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
