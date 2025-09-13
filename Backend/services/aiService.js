// services/aiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SpeechClient } = require("@google-cloud/speech");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const fs = require("fs");
const util = require("util");

// Initialize the Generative AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const speechClient = new SpeechClient();
const ttsClient = new TextToSpeechClient();
/**
 * Cleans and parses a JSON string from the AI's response.
 * @param {string} text - The raw text response from the AI.
 * @returns {object} The parsed JSON object.
 */

const parseAIResponse = (text) => {
  const cleanedText = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Failed to parse AI response:", cleanedText);
    // In case of parsing failure, return a structured error or fallback object
    return {
      error: "Invalid JSON response from AI",
      raw: cleanedText,
    };
  }
};

/**
 * Generates a new interview question.
 * @param {string} resumeText - The candidate's resume.
 * @param {string} difficulty - The desired difficulty ('easy', 'medium', 'hard').
 * @param {string[]} askedQuestions - A list of previously asked questions to ensure uniqueness.
 * @returns {Promise<string>} The generated question.
 */

generateQuestion = async (resumeText, difficulty, askedQuestions) => {
  const askedQuestionsString = askedQuestions
    .map((q) => q.question)
    .join("\n - ");
  const prompt = `
    You are an expert technical interviewer. Your task is to generate ONE technical interview question based on the provided resume.

    **Instructions:**
    1. The question difficulty must be: medium.
    2. The question must be relevant to the skills listed in the resume.
    3. Do NOT ask any of the following questions again:
       - ${askedQuestionsString}
    4. Return ONLY the question text, with no introductory phrases like "Here is a question:".

    **Resume:**
    """
    i am a js coder.
    """
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

/**
 * Analyzes a candidate's answer and provides feedback and the next difficulty level.
 * @param {string} question - The question that was asked.
 * @param {string} answer - The candidate's answer.
 * @returns {Promise<{feedback: string, nextDifficulty: string}>}
 */

analyzeAnswer = async (question, answer) => {
  const prompt = `
    You are an AI Interview Coach. Evaluate the candidate's answer based on technical accuracy, depth, and clarity.

    **Question:** "${question}"
    **Candidate's Answer:** "${answer}"

    **Your Task:**
    Provide a concise, one-sentence feedback and determine the difficulty for the next question (EASY, MEDIUM, or HARD).
    Return the result in a single, valid JSON object with no other text.

    **JSON Format:**
    {
      "feedback": "Your one-sentence evaluation of the answer.",
      "nextDifficulty": "EASY" | "MEDIUM" | "HARD"
    }
  `;

  const result = await model.generateContent(prompt);
  const parsed = parseAIResponse(result.response.text());

  return {
    feedback: parsed.feedback || "Could not generate feedback.",
    nextDifficulty: (parsed.nextDifficulty || "MEDIUM").toLowerCase(),
  };
};

/**
 * Generates final, overall feedback for the entire interview.
 * @param {Array<{question: string, answer: string}>} qaPairs - An array of all questions and answers.
 * @returns {Promise<{strengths: string, weaknesses: string, suggestions: string}>}
 */
generateFinalFeedback = async (qaPairs) => {
  const conversationHistory = qaPairs
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer || "No answer provided."}`)
    .join("\n\n");

  const prompt = `
    You are an experienced hiring manager providing final feedback on a technical interview.
    Based on the following transcript, provide a summary.

    **Transcript:**
    """
    ${conversationHistory}
    """

    **Your Task:**
    Return a single, valid JSON object with the following keys. The value for each key should be a single string with points separated by newlines (\\n).
    - "strengths": 2-3 key strengths demonstrated by the candidate.
    - "weaknesses": 2-3 areas for improvement.
    - "suggestions": 2-3 actionable suggestions for the candidate.

    **Example JSON Format:**
    {
      "strengths": "1. Strong foundational knowledge of React hooks.\\n2. Clear communication when explaining project architecture.",
      "weaknesses": "1. Lacked depth on database indexing concepts.\\n2. Could provide more specific examples from experience.",
      "suggestions": "1. Review advanced SQL optimization techniques.\\n2. Practice the STAR method for answering behavioral questions."
    }
  `;
  const result = await model.generateContent(prompt);
  const parsed = parseAIResponse(result.response.text());

  // Provide fallback content if the AI fails
  return {
    strengths: parsed.strengths || "Could not determine strengths.",
    weaknesses: parsed.weaknesses || "Could not determine weaknesses.",
    suggestions: parsed.suggestions || "Practice more to improve.",
  };
};

const transcribeAudio = async (audioBytes) => {
  const audio = { content: audioBytes };
  const config = {
    encoding: "WEBM_OPUS", // Match the format from the frontend
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

const synthesizeSpeech = async (text) => {
  const request = {
    input: { text },
    voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
    audioConfig: { audioEncoding: "MP3" },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  const writeFile = util.promisify(fs.writeFile);

  // Save the file to a public directory accessible by your frontend
  // Ensure you have a 'public/audio' folder
  const fileName = `output-${Date.now()}.mp3`;
  const filePath = `public/audio/${fileName}`;
  await writeFile(filePath, response.audioContent, "binary");

  // Return the path the frontend can use to access the file
  return `/audio/${fileName}`;
};
module.exports = {
  generateQuestion,
  analyzeAnswer,
  generateFinalFeedback,
  transcribeAudio,
  synthesizeSpeech,
};
