import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import mic from "mic";
import { SpeechClient } from "@google-cloud/speech";
import player from "play-sound";
import { promisify } from "util";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

// Environment setup
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configure Google clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const speechClient = new SpeechClient();
const play = promisify(player({}).play);

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  interviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Interview" }],
});

const interviewSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  interviewNumber: Number,
  questions: [
    {
      question: String,
      difficulty: String,
      answer: String,
      feedback: String,
    },
  ],
  finalFeedback: {
    strengths: String,
    weaknesses: String,
    suggestions: String,
  },
  progress: String,
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Interview = mongoose.model("Interview", interviewSchema);

// Audio utilities
const recordAudio = (duration = 5000) =>
  new Promise((resolve) => {
    const micInstance = mic({
      rate: "16000",
      channels: "1",
      fileType: "wav",
    });

    const stream = micInstance.getAudioStream();
    const output = path.join(tmpdir(), `${Date.now()}.wav`);
    const writeStream = fs.createWriteStream(output);

    stream.pipe(writeStream);
    micInstance.start();

    setTimeout(() => {
      micInstance.stop();
      stream.on("end", () => resolve(output));
    }, duration);
  });

const convertToMp3 = (wavPath) =>
  new Promise((resolve, reject) => {
    const mp3Path = wavPath.replace(".wav", ".mp3");
    exec(
      `ffmpeg -i ${wavPath} -vn -ar 44100 -ac 2 -b:a 192k ${mp3Path}`,
      (error) => {
        if (error) reject(error);
        else {
          fs.unlinkSync(wavPath);
          resolve(mp3Path);
        }
      }
    );
  });

// Core interview functions
const askedQuestions = new Set();

const speak = async (text) => {
  if (!text.trim()) return;

  try {
    const tempPath = path.join(tmpdir(), `${Date.now()}.mp3`);
    exec(`gtts-cli '${text}' -l en --output ${tempPath}`, async (error) => {
      if (error) throw error;
      await play(tempPath);
      fs.unlinkSync(tempPath);
    });
  } catch (e) {
    console.error("Audio error:", e);
  }
};

const listen = async () => {
  try {
    const audioPath = await recordAudio(10000);
    const [operation] = await speechClient.longRunningRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
      },
      audio: { content: fs.readFileSync(audioPath).toString("base64") },
    });

    const [response] = await operation.promise()
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    fs.unlinkSync(audioPath);
    return transcription
  } catch (e) {
    console.error("Speech recognition error:", e);
    return "";
  }
};

const askQuestion = async (resumeText, difficulty = "medium") => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `Act as an interviewer. Ask one ${difficulty}-level technical question based on this resume:\n${resumeText}\nReturn ONLY the question.`;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { response } = await model.generateContent(prompt);
      const question = response.text().trim();

      if (!askedQuestions.has(question)) {
        askedQuestions.add(question);
        return question;
      }
    } catch (e) {
      console.error("Question generation error:", e);
      if (attempt === 4) return null;
    }
  }
  return null;
};

const analyzeAnswer = async (question, answer) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `Evaluate this answer to the question:
  Question: ${question}
  Answer: ${answer}
  
  Provide feedback in one sentence and difficulty adjustment:
  "Feedback: <feedback>. Next: <HARDER/SAME/EASIER>"`;

  try {
    const { response } = await model.generateContent(prompt);
    const feedback = response.text().trim();

    let nextDifficulty = "medium";
    if (feedback.includes("Next: HARDER")) nextDifficulty = "hard";
    else if (feedback.includes("Next: EASIER")) nextDifficulty = "easy";

    return { feedback, nextDifficulty };
  } catch (e) {
    console.error("Analysis error:", e);
    return { feedback: "Error analyzing answer", nextDifficulty: "medium" };
  }
};

const generateFinalFeedback = async (qaPairs) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const history = qaPairs
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join("\n\n");

  const prompt = `Provide interview feedback with these sections:
  - strengths: 2-3 areas performed well (as string with line breaks)
  - weaknesses: 2-3 areas needing improvement
  - suggestions: 2-3 actionable suggestions
  
  Return ONLY JSON in this format:
  {
    "strengths": "1. ...\\n2. ...",
    "weaknesses": "1. ...\\n2. ...",
    "suggestions": "1. ...\\n2. ..."
  }
  
  Interview transcript:\n${history}`;

  try {
    const { response } = await model.generateContent(prompt);
    const feedback = response
      .text()
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(feedback);
  } catch (e) {
    console.error("Feedback generation error:", e);
    return {
      strengths: "1. Good effort\n2. Communication skills",
      weaknesses: "1. Technical depth\n2. Problem-solving details",
      suggestions: "1. Study core concepts\n2. Practice explaining solutions",
    };
  }
};

// Express routes
app.post("/start-interview", async (req, res) => {
  try {
    const token = req.headers["x-auth-token"];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, resumeText } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const lastInterview = await Interview.findOne({ userId }).sort({
      interviewNumber: -1,
    });
    const interviewNumber = (lastInterview?.interviewNumber || 0) + 1;

    const interview = new Interview({
      userId,
      interviewNumber,
      questions: [],
      progress: "In Progress",
    });
    await interview.save();

    user.interviews.push(interview._id);
    await user.save();

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    res.flushHeaders();
    res.write(
      `data: ${JSON.stringify({
        status: "Connected",
        interviewId: interview._id,
      })}\n\n`
    );

    let difficulty = "medium";
    const questions = [];

    for (let i = 0; i < 5; i++) {
      res.write(
        `data: ${JSON.stringify({
          progress: `Question ${i + 1}/5`,
          questionNumber: i + 1,
        })}\n\n`
      );

      const question = await askQuestion(resumeText, difficulty);
      if (!question) continue;

      res.write(
        `data: ${JSON.stringify({
          type: "question",
          question,
          difficulty,
        })}\n\n`
      );
      await speak(question);

      const answer = await listen();
      res.write(`data: ${JSON.stringify({ type: "answer", answer })}\n\n`);

      const { feedback, nextDifficulty } = await analyzeAnswer(
        question,
        answer
      );
      res.write(`data: ${JSON.stringify({ type: "feedback", feedback })}\n\n`);

      questions.push({ question, answer, difficulty, feedback });
      difficulty = nextDifficulty;
      interview.questions = questions;
      await interview.save();
    }

    interview.finalFeedback = await generateFinalFeedback(questions);
    interview.progress = "Completed";
    await interview.save();

    res.write(
      `data: ${JSON.stringify({
        type: "complete",
        finalFeedback: interview.finalFeedback,
      })}\n\n`
    );
    res.end();
  } catch (e) {
    console.error("Interview error:", e);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: e.message,
      })}\n\n`
    );
    res.end();
  }
});

app.get("/user-interviews", async (req, res) => {
  try {
    const token = req.headers["x-auth-token"];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const interviews = await Interview.find({ userId: decoded.userId }).sort({
      date: -1,
    });

    res.json(interviews);
  } catch (e) {
    console.error("Fetch error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// JWT middleware
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
