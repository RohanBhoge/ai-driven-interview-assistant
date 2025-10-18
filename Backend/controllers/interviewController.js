const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PythonShell } = require("python-shell");
const path = require("path");
const Interview = require("../models/interview.js");
const User = require("../models/User.js");
const aiService = require("../services/aiService.js");

const MAX_QUESTIONS = 5; // Define the total number of questions for an interview

/**
 * Starts a new interview.
 * Generates the first question.
 */
exports.startInterview = async (req, res) => {
  try {
    const { resumeText, userId } = req.body;
    // const userId = req.user.userId; // Assuming JWT middleware adds user to req

    if (!resumeText) {
      return res.status(400).json({ error: "Resume text is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Generate the first question
    const firstQuestionText = await aiService.generateQuestion(
      resumeText,
      "medium",
      []
    );

    const interview = new Interview({
      userId,
      resumeText, // Store the resume text for future reference
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

    // Add interview to user's record
    // user.interviews.push(interview._id);
    // await user.save();

    res.status(201).json({
      message: "Interview started successfully.",
      interviewId: interview._id,
      question: firstQuestionText,
      questionNumber: 1,
      totalQuestions: MAX_QUESTIONS,
    });

  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Failed to start interview." });
  }
};

/**
 * Submits an answer and gets the next question.
 * If it's the final answer, it automatically generates the final feedback.
 */
exports.submitAnswer = async (req, res) => {
  try {
    const { interviewId, answer } = req.body;
    const userId = req.user.userId;

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: userId,
      progress: "In Progress",
    });

    if (!interview) {
      return res.status(404).json({ error: "Active interview not found." });
    }

    // Update the last question with the user's answer
    const lastQuestion = interview.questions[interview.questions.length - 1];
    lastQuestion.answer = answer;

    // Analyze the answer to get feedback and next difficulty
    const analysis = await aiService.analyzeAnswer(
      lastQuestion.question,
      answer
    );
    lastQuestion.feedback = analysis.feedback;

    // Check if the interview is complete
    if (interview.questions.length >= MAX_QUESTIONS) {
      // If it is the last question, end the interview
      interview.progress = "Completed";
      interview.completedAt = new Date();

        // Generate final feedback
        try {
          const qaPairs = interview.questions.map((q) => ({
            question: q.question,
            answer: q.answer,
          }));

          const feedbackScript = path.join(
            __dirname,
            "../../AI-Interview/interview.py"
          );
          const feedbackOptions = {
            mode: "text",
            pythonOptions: ["-u"],
            args: ["--final-feedback", JSON.stringify(qaPairs)],
          };

          const feedbackShell = new PythonShell(
            feedbackScript,
            feedbackOptions
          );

          // In the shell.end handler, modify the feedbackShell.on('message') part:
          feedbackShell.on("message", async (feedbackMsg) => {
            try {
              let feedback;
              try {
                // First try to parse directly
                feedback = JSON.parse(feedbackMsg);
              } catch (e) {
                // If direct parse fails, try cleaning the response
                const cleaned = feedbackMsg
                  .replace(/```json/g, "")
                  .replace(/```/g, "")
                  .trim();
                feedback = JSON.parse(cleaned);
              }

              // Convert arrays to strings if needed
              const stringifyIfArray = (value) => {
                if (Array.isArray(value)) {
                  return value.map((item, i) => `${i + 1}. ${item}`).join("\n");
                }
                return value;
              };

              interview.finalFeedback = {
                strengths: stringifyIfArray(
                  feedback.strengths ||
                    feedback.fallback?.strengths ||
                    "No strengths identified"
                ),
                weaknesses: stringifyIfArray(
                  feedback.weaknesses ||
                    feedback.fallback?.weaknesses ||
                    "No weaknesses identified"
                ),
                suggestions: stringifyIfArray(
                  feedback.suggestions ||
                    feedback.fallback?.suggestions ||
                    "No suggestions provided"
                ),
              };

              await interview.save();

      return res.status(200).json({
        message: "Interview completed!",
        feedback: analysis.feedback,
        isComplete: true,
        finalFeedback: interview.finalFeedback,
      });
    }

    // If not complete, generate the next question
    const askedQuestions = interview.questions.map((q) => q.question);
    const nextQuestionText = await aiService.generateQuestion(
      interview.resumeText,
      analysis.nextDifficulty,
      askedQuestions
    );

    interview.questions.push({
      question: nextQuestionText,
      difficulty: analysis.nextDifficulty,
    });

    await interview.save();

    res.status(200).json({
      message: "Answer submitted.",
      feedback: analysis.feedback,
      isComplete: false,
      nextQuestion: nextQuestionText,
      questionNumber: interview.questions.length,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error: " + error.message });
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: "Internal server error: " + error.message,
        })}\n\n`
      );
      res.end();
    }
  }
};

/**
 * Manually stops an interview before completion.
 */
exports.stopInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;
    const userId = req.user.userId;

    const interview = await Interview.findOneAndUpdate(
      {
        _id: interviewId,
        userId: userId,
        progress: { $ne: "Completed" },
      },
      {
        $set: {
          progress: "Stopped",
          stoppedAt: new Date(),
          finalFeedback: {
            strengths: "Interview was stopped before completion",
            weaknesses: "Unable to assess full performance",
            suggestions: "Try completing the full interview next time",
          },
        },
      },
      { new: true }
    );

    if (!interview) {
      return res
        .status(404)
        .json({ error: "Active interview not found to stop." });
    }

    res.status(200).json({ message: "Interview stopped successfully." });
  } catch (error) {
    console.error("Error stopping interview:", error);
    res.status(500).json({ error: "Failed to stop interview." });
  }
};

/**
 * Fetches all interviews for the logged-in user.
 */
exports.getUserInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(interviews);
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ error: "Failed to fetch interviews." });
  }
};
