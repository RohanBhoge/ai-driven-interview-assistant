// services/aiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleGenAI } = require("@google/genai"); // TTS client
const { SpeechClient } = require("@google-cloud/speech");
const fs = require("fs");
const util = require("util");
const path = require("path");
const axios = require("axios"); // Note: axios isn't used in this file, but safe to keep

// --- 1. ALL CLIENT INITIALIZATIONS ---

// Generative text model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Google Speech client (for transcription)
const speechClient = new SpeechClient();

// GenAI TTS client (for text-to-speech)
const genaiTTSKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!genaiTTSKey) {
  console.warn("Warning: GEMINI_API_KEY / GOOGLE_API_KEY not set - GenAI TTS will fail.");
}
const genaiTTS = new GoogleGenAI({ apiKey: genaiTTSKey });


// --- 2. HELPER FUNCTIONS ---

/**
* parseAIResponse - helper to clean and parse possible JSON responses from generative text
*/
const parseAIResponse = (text) => {
  const cleanedText = (text || "").replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    return { error: "Invalid JSON response from AI", raw: cleanedText };
  }
};

/**
* extractTextFromResult - safe extractor for text returned by model.generateContent variants
*/
function extractTextFromResult(result) {
  try {
    if (!result) return "";
    if (result.response && typeof result.response.text === "function") {
      return (result.response.text() || "").trim();
    }
    if (typeof result.text === "string") {
      return result.text.trim();
    }
    return JSON.stringify(result).slice(0, 2000);
  } catch (e) {
    return "";
  }
}

// --- 3. CORE AI FUNCTIONS ---

/**
* generateQuestion
*/
const generateQuestion = async (resumeText, difficulty = "medium", askedQuestions = []) => {
  const askedQuestionsList = (askedQuestions || []).map((q) => {
    if (!q) return "";
    if (typeof q === "string") return q;
    if (typeof q === "object" && q.question) return q.question;
    return String(q);
  });
  const askedQuestionsString = askedQuestionsList.length > 0 ? askedQuestionsList.join("\n - ") : "None";

  const prompt = `
You are an expert technical interviewer. Generate ONE ${difficulty}-level technical interview question
based on the resume provided below. The question must be relevant to the candidate's skills.

Resume:
"""
${resumeText}
"""

Do NOT include any explanatory text or numbering. Return ONLY the question text.
Do not reuse any of these previously asked questions:
 - ${askedQuestionsString}
`;

  const result = await model.generateContent(prompt);
  const questionText = extractTextFromResult(result);
  return questionText;
};

/**
* analyzeAnswer
*/
const analyzeAnswer = async (question, answer) => {
  const prompt = `
You are an AI Interview Coach. Evaluate the candidate's answer based on technical accuracy, depth, and clarity.

Question: "${question}"
Candidate's Answer: "${answer}"

Provide a concise one-sentence feedback and indicate the appropriate next difficulty level
as one of HARDER, SAME, or EASIER. Return the result as JSON:
{
  "feedback": "One-sentence feedback. Next: HARDER",
  "nextDifficulty": "HARDER"
}
`;

  const result = await model.generateContent(prompt);
  const rawText = extractTextFromResult(result);
  const parsed = parseAIResponse(rawText);

  let nd = (parsed.nextDifficulty || parsed.next || "").toString().toUpperCase();
  if (nd.includes("HARD")) nd = "hard";
  else if (nd.includes("EAS")) nd = "easy";
  else nd = "medium";

  return {
    feedback: parsed.feedback || rawText || "Could not generate feedback.",
    nextDifficulty: nd,
  };
};

/**
* generateFinalFeedback
*/
const generateFinalFeedback = async (qaPairs) => {
  const conversationHistory = (qaPairs || [])
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer || "No answer provided."}`)
    .join("\n\n");

  const prompt = `
You are an experienced hiring manager providing final feedback on a technical interview.
Based on the transcript below, return a single valid JSON object with keys:
- strengths: string (2-3 items separated by newlines)
- weaknesses: string (2-3 items separated by newlines)
- suggestions: string (2-3 items separated by newlines)

Transcript:
${conversationHistory}
`;

  const result = await model.generateContent(prompt);
  const rawText = extractTextFromResult(result);

  const parsed = (() => {
    try {
      return JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch {
      return null;
    }
  })();

  if (parsed && (parsed.strengths || parsed.weaknesses || parsed.suggestions)) {
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.join("\n") : String(parsed.strengths || ""),
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.join("\n") : String(parsed.weaknesses || ""),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.join("\n") : String(parsed.suggestions || ""),
    };
  }

  return {
    strengths: "",
    weaknesses: "",
    suggestions: rawText || "Could not generate final feedback.",
  };
};

/**
* transcribeAudio - keep Google Speech-to-Text for transcriptions (expects base64 content string)
*/
const transcribeAudio = async (audioBytes) => {
  const audio = { content: audioBytes };
  const config = {
    encoding: "WEBM_OPUS",
    sampleRateHertz: 48000,
    languageCode: "en-US",
  };
  const request = { audio, config };

  const [response] = await speechClient.recognize(request);
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join("\n");
  return transcription;
};

/**
* synthesizeSpeech - use Google GenAI TTS (gemini-2.5-flash-preview-tts)
* returns: "/audio/<file>" or null on failure
*/
/**
 * synthesizeSpeech - use Google GenAI TTS (gemini-1.5-flash-preview-tts)
 * returns: "/audio/<file>" or null on failure
 */
const synthesizeSpeech = async (text) => {
  if (!genaiTTSKey) {
    console.warn("GenAI TTS key not set; skipping TTS.");
    return null;
  }

  const audioDir = path.join(process.cwd(), "public", "audio");
  fs.mkdirSync(audioDir, { recursive: true });

  try {
    // Build request
    const response = await genaiTTS.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [
        {
          parts: [{ text }],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore", // You can change this voice name
            },
          },
        },
      },
    });

    // Find the audio part in the response
    const audioPart = response?.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData && part.inlineData.mimeType.startsWith("audio/")
    );

    if (!audioPart) {
      console.error(
        "GenAI TTS response did not include audio data:",
        JSON.stringify(response?.candidates?.[0] || response)
      );
      return null;
    }

    const base64Data = audioPart.inlineData.data;
    const mimeType = audioPart.inlineData.mimeType;

    // Determine the correct file extension from the mimeType
    let extension;
    if (mimeType.includes("ogg")) {
      extension = "ogg";
    } else if (mimeType.includes("mpeg")) {
      extension = "mp3";
    } else if (mimeType.includes("wav")) {
      extension = "wav";
    } else {
      // Fallback to mp3 if unknown
      console.warn(`Unknown audio mimeType: ${mimeType}, saving as .mp3`);
      extension = "mp3";
    }

    const audioBuffer = Buffer.from(base64Data, "base64");
    const fileName = `tts-${Date.now()}.${extension}`; // Use correct extension
    const filePath = path.join(audioDir, fileName);
    await util.promisify(fs.writeFile)(filePath, audioBuffer);

    return `/audio/${fileName}`; // Return the URL with the correct extension
  } catch (err) {
    // Log the detailed error message from Google
    const errorDetails = err?.cause?.error || err?.message || err;
    console.error("GenAI TTS error:", JSON.stringify(errorDetails, null, 2));

    // try to log body if present
    if (err?.response) {
      try {
        console.error("GenAI response body:", err.response.data);
      } catch {}
    }
    return null;
  }
};

// --- 4. EXPORTS ---

module.exports = {
  generateQuestion,
  analyzeAnswer,
  generateFinalFeedback,
  transcribeAudio,
  synthesizeSpeech,
};
