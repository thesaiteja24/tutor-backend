import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config();

const baseUrl = (process.env.OMNIVOICE_TTS_ENDPOINT_URL || "https://omnivoice.codegnan.ai").replace(/\/+$/, "");
const apiKey = process.env.OMNIVOICE_TTS_API_KEY || "4210dad602dd0d42d43d367f5dae16033288076b53926489d0df79db30f5ec8c";
const model = process.env.OMNIVOICE_TTS_MODEL || "omnivoice";

interface PersonaPreviewSpec {
  personaId: string;
  name: string;
  voiceId: string;
  previews: Record<string, { langCode: string; text: string }>;
}

const PERSONA_PREVIEWS: PersonaPreviewSpec[] = [
  {
    personaId: "01950000-0000-7000-8000-000000000001",
    name: "maya",
    voiceId: "b72c4802",
    previews: {
      en: {
        langCode: "en",
        text: "Hey! I'm Maya, your high-energy English conversation buddy. Let's make speaking English exciting and fun!",
      },
      te: {
        langCode: "te",
        text: "హాయ్! నేను మాయ. నాతో కలిసి ఇంగ్లీష్ మాట్లాడటం చాలా సరదాగా, ఈజీగా ఉంటుంది. మాట్లాడటం మొదలుపెడదామా?",
      },
      hi: {
        langCode: "hi",
        text: "नमस्ते! मैं माया हूँ। मेरे साथ इंग्लिश में बात करना बहुत आसान और मज़ेदार होगा। चलिए शुरू करते हैं!",
      },
      ta: {
        langCode: "ta",
        text: "வணக்கம்! நான் மாயா. என்னுடன் ஆங்கிலம் பேசுவது மிகவும் எளிதாகவும் சுவாரஸ்யமாகவும் இருக்கும். ஆரம்பிக்கலாமா?",
      },
      kn: {
        langCode: "kn",
        text: "ನಮಸ್ಕಾರ! ನಾನು ಮಾಯಾ. ನನ್ನೊಂದಿಗೆ ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡುವುದು ತುಂಬಾ ಸುಲಭ ಮತ್ತು ಖುಷಿಯಾಗಿರುತ್ತದೆ. ಶುರು ಮಾಡೋಣವಾ?",
      },
      ml: {
        langCode: "ml",
        text: "ഹലോ! ഞാൻ മായ. എന്നോടൊപ്പം ഇംഗ്ലീഷ് സംസാരിക്കുന്നത് വളരെ എളുപ്പവും രസകരവുമായിരിക്കും. നമുക്ക് തുടങ്ങാം!",
      },
    },
  },
  {
    personaId: "01950000-0000-7000-8000-000000000002",
    name: "leo",
    voiceId: "demo0001",
    previews: {
      en: {
        langCode: "en",
        text: "Hey there, I'm Leo! Relax, take your time, and let's practice casual, real-world English together.",
      },
      te: {
        langCode: "te",
        text: "హలో, నేను లియో! ఎలాంటి టెన్షన్ లేకుండా క్యాజువల్ ఇంగ్లీష్ నాతో ప్రాక్టీస్ చేయండి. లెట్స్ గో!",
      },
      hi: {
        langCode: "hi",
        text: "हे! मैं लियो हूँ। बिना किसी झिझक के मेरे साथ रोज़मर्रा की इंग्लिश प्रैक्टिस कीजिए।",
      },
      ta: {
        langCode: "ta",
        text: "வணக்கம், நான் லியோ! எந்த தயக்கமும் இல்லாமல் இயல்பான ஆங்கிலத்தை என்னுடன் பயிற்சி செய்யுங்கள்.",
      },
      kn: {
        langCode: "kn",
        text: "ನಮಸ್ಕಾರ, ನಾನು ಲಿಯೋ! ಯಾವುದೇ ಆತಂಕವಿಲ್ಲದೆ ಆರಾಮವಾಗಿ ನನ್ನೊಂದಿಗೆ ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡಿ.",
      },
      ml: {
        langCode: "ml",
        text: "ഹലോ, ഞാൻ ലിയോ! യാതൊരു മടിയുമില്ലാതെ എന്നോടൊപ്പം ലളിതമായി ഇംഗ്ലീഷ് പരിശീലിക്കാം.",
      },
    },
  },
  {
    personaId: "01950000-0000-7000-8000-000000000003",
    name: "emma",
    voiceId: "7fcf2618",
    previews: {
      en: {
        langCode: "en",
        text: "Hello, I'm Emma. I'm here to listen patiently and help you build your English confidence step by step.",
      },
      te: {
        langCode: "te",
        text: "నమస్కారం, నేను ఎమ్మా. మీరు ఎలాంటి భయం లేకుండా ఆత్మవిశ్వాసంతో ఇంగ్లీష్ మాట్లాడేలా నేను గైడ్ చేస్తాను.",
      },
      hi: {
        langCode: "hi",
        text: "नमस्ते, मैं एम्मा हूँ। मैं आपको पूरे धैर्य के साथ आत्मविश्वास से इंग्लिश बोलना सिखाऊंगी।",
      },
      ta: {
        langCode: "ta",
        text: "வணக்கம், நான் எம்மா. நீங்கள் தன்னம்பிக்கையுடன் ஆங்கிலம் பேச நான் முழுமையாக வழிகாட்டுகிறேன்.",
      },
      kn: {
        langCode: "kn",
        text: "ನಮಸ್ಕಾರ, ನಾನು ಎಮ್ಮಾ. ನೀವು ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡಲು ನಾನು ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇನೆ.",
      },
      ml: {
        langCode: "ml",
        text: "നമസ്കാരം, ഞാൻ എമ്മ. ആത്മവിശ്വാസത്തോടെ ഇംഗ്ലീഷ് സംസാരിക്കാൻ ഞാൻ നിങ്ങളെ സഹായിക്കാം.",
      },
    },
  },
  {
    personaId: "01950000-0000-7000-8000-000000000004",
    name: "david",
    voiceId: "68895820",
    previews: {
      en: {
        langCode: "en",
        text: "Hello, I'm David. Let's practice structured, articulate, and professional English communication together.",
      },
      te: {
        langCode: "te",
        text: "నమస్కారం, నేను డేవిడ్. స్పష్టమైన మరియు ప్రొఫెషనల్ ఇంగ్లీష్ సంభాషణలను నాతో కలిసి సాధన చేయండి.",
      },
      hi: {
        langCode: "hi",
        text: "नमस्ते, मैं डेविड हूँ। आइए साथ मिलकर स्पष्ट और पेशेवर इंग्लिश बातचीत का अभ्यास करें।",
      },
      ta: {
        langCode: "ta",
        text: "வணக்கம், நான் டேవిட். தெளிவான மற்றும் தொழில்முறை ஆங்கிலத்தை என்னுடன் இணைந்து பயிற்சி செய்யுங்கள்.",
      },
      kn: {
        langCode: "kn",
        text: "ನಮಸ್ಕಾರ, ನಾನು ಡೇವಿಡ್. ಸ್ಪಷ್ಟ ಮತ್ತು ವೃತ್ತಿಪರ ಇಂಗ್ಲಿಷ್ ಸಂಭಾಷಣೆಯನ್ನು ನನ್ನೊಂದಿಗೆ ಅಭ್ಯಾಸ ಮಾಡಿ.",
      },
      ml: {
        langCode: "ml",
        text: "നമസ്കാരം, ഞാൻ ഡേവിഡ്. വ്യക്തവും ഔദ്യോഗಿಕവുമായ ഇംഗ്ലീഷ് సంభాషణను നമുക്ക് ఒకമിച്ച് പരിശീലിക്കാം.",
      },
    },
  },
];

async function generateAllPreviews() {
  console.log(`🎙️ Generating 24 multilingual persona audio previews via Omnivoice TTS (${baseUrl})...`);

  const baseDir = path.resolve(process.cwd(), "public/audio/personas");

  for (const persona of PERSONA_PREVIEWS) {
    const personaDir = path.join(baseDir, persona.name);
    if (!fs.existsSync(personaDir)) {
      fs.mkdirSync(personaDir, { recursive: true });
    }

    for (const [lang, spec] of Object.entries(persona.previews)) {
      const targetFile = path.join(personaDir, `preview_${lang}.wav`);

      console.log(`⏳ Synthesizing ${persona.name} (${persona.voiceId}) [${lang}]...`);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey.replace(/^Bearer\s+/i, "").trim()}`;
        }

        const payload = {
          model,
          input: spec.text,
          voice: persona.voiceId,
          response_format: "wav",
          language: spec.langCode,
        };

        const response = await fetch(`${baseUrl}/v1/audio/speech`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const arrayBuf = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        fs.writeFileSync(targetFile, buffer);
        console.log(`✅ Saved: ${targetFile} (${buffer.length} bytes)`);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        console.error(`❌ Failed to synthesize ${persona.name} [${lang}]:`, errMessage);
      }
    }
  }

  console.log("🎉 All 24 persona previews synthesized successfully via Omnivoice!");
}

generateAllPreviews().catch((err) => {
  console.error("Fatal error generating previews:", err);
  process.exit(1);
});
