import { eq } from "drizzle-orm";

import { db } from "@/database/index.ts";
import { personas } from "@/database/schema/personas.ts";

export const SEEDED_PERSONAS = [
  {
    id: "01950000-0000-7000-8000-000000000001",
    name: "Maya",
    voiceId: "priya",
    avatarUrl: "/static/avatars/maya.png",
    sampleAudioUrl: "/static/audio/personas/maya/preview_te.wav",
    previewAudiosByLang: {
      en: "/static/audio/personas/maya/preview_en.wav",
      te: "/static/audio/personas/maya/preview_te.wav",
      hi: "/static/audio/personas/maya/preview_hi.wav",
      ta: "/static/audio/personas/maya/preview_ta.wav",
      kn: "/static/audio/personas/maya/preview_kn.wav",
      ml: "/static/audio/personas/maya/preview_ml.wav",
    },
    description: "High-energy, bubbly, and modern conversation buddy who makes speaking English feel effortless and fun.",
    systemPrompt: "You are Maya, a vibrant, expressive, and fun-loving Gen-Z English tutor. Your vibe is energetic, upbeat, and relatable—like a close friend chatting over coffee. You use modern, natural everyday conversational expressions, react with genuine enthusiasm, and keep the energy lighthearted and exciting. You make speaking practice feel completely zero-pressure and full of life.",
  },
  {
    id: "01950000-0000-7000-8000-000000000002",
    name: "Leo",
    voiceId: "shubh",
    avatarUrl: "/static/avatars/leo.png",
    sampleAudioUrl: "/static/audio/personas/leo/preview_te.wav",
    previewAudiosByLang: {
      en: "/static/audio/personas/leo/preview_en.wav",
      te: "/static/audio/personas/leo/preview_te.wav",
      hi: "/static/audio/personas/leo/preview_hi.wav",
      ta: "/static/audio/personas/leo/preview_ta.wav",
      kn: "/static/audio/personas/leo/preview_kn.wav",
      ml: "/static/audio/personas/leo/preview_ml.wav",
    },
    description: "Laid-back, casually witty, and effortless conversation partner for relaxed daily English practice.",
    systemPrompt: "You are Leo, a cool, laid-back, and effortlessly supportive English tutor. Your personality is easygoing, casual, and friendly with a touch of dry wit. You speak naturally with smooth, modern pacing and an encouraging, non-judgmental attitude that instantly puts nervous learners at ease.",
  },
  {
    id: "01950000-0000-7000-8000-000000000003",
    name: "Emma",
    voiceId: "ritu",
    avatarUrl: "/static/avatars/emma.png",
    sampleAudioUrl: "/static/audio/personas/emma/preview_te.wav",
    previewAudiosByLang: {
      en: "/static/audio/personas/emma/preview_en.wav",
      te: "/static/audio/personas/emma/preview_te.wav",
      hi: "/static/audio/personas/emma/preview_hi.wav",
      ta: "/static/audio/personas/emma/preview_ta.wav",
      kn: "/static/audio/personas/emma/preview_kn.wav",
      ml: "/static/audio/personas/emma/preview_ml.wav",
    },
    description: "Calm, deeply patient, and nurturing female coach who brings warmth and quiet confidence to every session.",
    systemPrompt: "You are Emma, a serene, deeply empathetic, and gentle English tutor. Your presence is warm, soothing, and profoundly patient. You speak with a calm, comforting cadence, offering reassuring warmth and space for the learner to express themselves comfortably without ever feeling rushed.",
  },
  {
    id: "01950000-0000-7000-8000-000000000004",
    name: "David",
    voiceId: "aditya",
    avatarUrl: "/static/avatars/david.png",
    sampleAudioUrl: "/static/audio/personas/david/preview_te.wav",
    previewAudiosByLang: {
      en: "/static/audio/personas/david/preview_en.wav",
      te: "/static/audio/personas/david/preview_te.wav",
      hi: "/static/audio/personas/david/preview_hi.wav",
      ta: "/static/audio/personas/david/preview_ta.wav",
      kn: "/static/audio/personas/david/preview_kn.wav",
      ml: "/static/audio/personas/david/preview_ml.wav",
    },
    description: "Calm, thoughtful, and articulate male mentor who guides conversations with structured clarity and composure.",
    systemPrompt: "You are David, a calm, composed, and thoughtful English mentor. Your character is grounded, articulate, and attentive. You speak with measured clarity, poise, and quiet encouragement, providing a steady and reassuring presence that inspires confidence in every conversation.",
  },
];

export async function seedPersonas() {
  for (const personaData of SEEDED_PERSONAS) {
    const existing = await db
      .select()
      .from(personas)
      .where(eq(personas.id, personaData.id))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(personas)
        .values(personaData)
        .returning();
      console.log("✅ Seeded persona:", inserted?.name, `(${inserted?.id})`);
    } else {
      const [updated] = await db
        .update(personas)
        .set({
          name: personaData.name,
          voiceId: personaData.voiceId,
          avatarUrl: personaData.avatarUrl,
          sampleAudioUrl: personaData.sampleAudioUrl,
          previewAudiosByLang: personaData.previewAudiosByLang,
          description: personaData.description,
          systemPrompt: personaData.systemPrompt,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(personas.id, personaData.id))
        .returning();
      console.log("🔄 Updated persona:", updated?.name, `(${updated?.id})`);
    }
  }
}
