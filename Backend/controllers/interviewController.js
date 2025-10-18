// controllers/interviewController.js

const mongoose = require("mongoose");
const Interview = require("../models/interview.js");
const User = require("../models/User.js");
const aiService = require("../services/aiService.js");

const MAX_QUESTIONS = 5; // Total number of questions per interview

/**
 * Start interview (POST /api/interview/start)
 * Body: { resumeText: "..." }
 * Auth: required (x-auth-token)
 */
exports.startInterview = async (req, res) => {
  try {
    const resumeText = req.body.resumeText;
    const userId = (req.user && req.user.userId) || req.userId || req.body.userId;

    if (!resumeText) {
      return res.status(400).json({ error: "Resume text is required." });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const firstQuestionText = await aiService.generateQuestion(resumeText, "medium", []);

    const interview = new Interview({
      userId,
      resumeText,
      questions: [
        {
          question: firstQuestionText,
          difficulty: "medium",
          answer: "",
          feedback: "",
        },
      ],
      progress: "In Progress",
    });

    await interview.save();

    // Generate audio for the first question
    let audioUrl = null;
    try {
      audioUrl = await aiService.synthesizeSpeech(firstQuestionText);
    } catch (e) {
      console.warn("Failed to synthesize speech for first question:", e.message || e);
    }

    res.status(201).json({
      message: "Interview started successfully.",
      interviewId: interview._id,
      question: firstQuestionText,
      audioUrl,
      questionNumber: 1,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Failed to start interview." });
  }
};

/**
 * Submit answer (POST /api/interview/submit)
 * Body: { interviewId: "...", answer: "..." } OR { interviewId: "...", audioBase64: "..." }
 */
exports.submitAnswer = async (req, res) => {
  try {
    const { interviewId } = req.body;
    const providedAnswer = req.body.answer;
    const audioBase64 = req.body.audioBase64;
    const userId = (req.user && req.user.userId) || req.userId;

    if (!userId) return res.status(401).json({ error: "User not authenticated." });
    if (!interviewId) return res.status(400).json({ error: "interviewId is required." });

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: userId,
      progress: "In Progress",
    });
    if (!interview) return res.status(404).json({ error: "Active interview not found." });

    // Determine the answer text: prefer provided text; else transcribe audioBase64
    let answerText = providedAnswer && providedAnswer.trim() ? providedAnswer.trim() : "";
    if (!answerText && audioBase64) {
      try {
        // audioBase64 should be a base64 string (no data:prefix). aiService.transcribeAudio expects base64 content
        answerText = await aiService.transcribeAudio(audioBase64);
      } catch (e) {
        console.error("Transcription error:", e);
        answerText = "";
      }
    }

    if (!answerText) {
      answerText = "No answer provided";
    }

    // Update last question with answer
    const lastQuestion = interview.questions[interview.questions.length - 1];
    if (!lastQuestion) {
      return res.status(400).json({ error: "No current question found." });
    }
    lastQuestion.answer = answerText;

    // Analyze the answer
    const analysis = await aiService.analyzeAnswer(lastQuestion.question, answerText);
    lastQuestion.feedback = analysis.feedback || "";

    // If this was the final answer, generate final feedback and complete the interview
    if (interview.questions.length >= MAX_QUESTIONS) {
      interview.progress = "Completed";
      interview.completedAt = new Date();

      const qaPairs = interview.questions.map((q) => ({
        question: q.question,
        answer: q.answer,
      }));
      interview.finalFeedback = await aiService.generateFinalFeedback(qaPairs);

      await interview.save();

      return res.status(200).json({
        message: "Interview completed!",
        feedback: analysis.feedback,
        isComplete: true,
        finalFeedback: interview.finalFeedback,
      });
    }

    // Not complete: generate next question
    const askedQuestions = interview.questions.map((q) => q.question); // array of strings
    const nextQuestionText = await aiService.generateQuestion(
      interview.resumeText,
      analysis.nextDifficulty || "medium",
      askedQuestions
    );

    interview.questions.push({
      question: nextQuestionText,
      difficulty: analysis.nextDifficulty || "medium",
      answer: "",
      feedback: "",
    });

    await interview.save();

    // Generate audio for next question
    let audioUrl = null;
    try {
      audioUrl = await aiService.synthesizeSpeech(nextQuestionText);
    } catch (e) {
      console.warn("Failed to synthesize speech for next question:", e.message || e);
    }

    res.status(200).json({
      message: "Answer submitted.",
      feedback: analysis.feedback,
      isComplete: false,
      nextQuestion: nextQuestionText,
      audioUrl,
      questionNumber: interview.questions.length,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ error: "Failed to process your answer." });
  }
};

/**
 * Stop interview (POST /api/interview/stop)
 * Body: { interviewId: "..." }
 */
exports.stopInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;
    const userId = (req.user && req.user.userId) || req.userId;

    if (!userId) return res.status(401).json({ error: "User not authenticated." });
    if (!interviewId) return res.status(400).json({ error: "interviewId is required." });

    const interview = await Interview.findOneAndUpdate(
      { _id: interviewId, userId: userId, progress: "In Progress" },
      {
        $set: {
          progress: "Stopped",
          stoppedAt: new Date(),
          finalFeedback: {
            strengths: "Not assessed.",
            weaknesses: "Interview was stopped before completion.",
            suggestions: "Complete the full interview to receive feedback.",
          },
        },
      },
      { new: true }
    );

    if (!interview) {
      return res.status(404).json({ error: "Active interview not found to stop." });
    }

    res.status(200).json({ message: "Interview stopped successfully." });
  } catch (error) {
    console.error("Error stopping interview:", error);
    res.status(500).json({ error: "Failed to stop interview." });
  }
};

/**
 * Get interviews for logged in user (GET /api/interview/interviews)
 */
exports.getUserInterviews = async (req, res) => {
  try {
    const userId = (req.user && req.user.userId) || req.userId;
    if (!userId) return res.status(401).json({ error: "User not authenticated." });

    const interviews = await Interview.find({ userId: userId }).sort({ createdAt: -1 });
    res.status(200).json(interviews);
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ error: "Failed to fetch interviews." });
  }
};
