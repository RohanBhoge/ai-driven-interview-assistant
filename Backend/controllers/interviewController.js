const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PythonShell } = require("python-shell");
const path = require("path");
const Interview = require("../models/interview.js");
const User = require("../models/User.js");

exports.startInterview = async (req, res) => {
  try {
    // 1. Verify authentication
    const token = req.headers["x-auth-token"];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // 3. Get parameters from query (not body for SSE)
    const { userId, resumeText } = req.query;
    if (!userId || !resumeText) {
      return res.status(400).json({ error: "Missing userId or resumeText" });
    }

    // 4. Set proper SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Credentials": "true",
    });
    res.flushHeaders();

    // 5. Find the user and create interview
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    debugger;
    const lastInterview = await Interview.findOne({ userId }).sort({
      interviewNumber: -1,
    });
    const interviewNumber = lastInterview
      ? lastInterview.interviewNumber + 1
      : 1;

    const interview = new Interview({
      userId,
      interviewNumber,
      questions: [],
      progress: "In Progress",
    });
    await interview.save();

    if (!Array.isArray(user.interviews)) {
      user.interviews = [];
    }
    user.interviews.push(interview._id);
    await user.save();

    // 6. Send initial connection message
    res.write(
      `data: ${JSON.stringify({
        status: "Connected",
        interviewId: interview._id,
      })}\n\n`
    );

    // 7. Start Python script
    const pythonScript = path.join(
      __dirname,
      "../../AI-Interview/interview.py"
    );
    const options = {
      pythonOptions: ["-u"],
      args: [resumeText],
      mode: "text",
    };

    console.log("Starting Python script...");
    const shell = new PythonShell(pythonScript, options);

    // Timeout handling
    // const timeout = setTimeout(() => {
    //   console.error("Python script timed out");
    //   res.write(
    //     `data: ${JSON.stringify({
    //       type: "error",
    //       error: "Python script timed out",
    //     })}\n\n`
    //   );
    //   shell.terminate();
    //   res.end();
    // }, 120000);

    // Message handling
    shell.on("message", async (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log("Received message from Python:", parsedMessage);

        // Add timestamp to all messages
        parsedMessage.timestamp = new Date().toISOString();

        // Handle different message types
        if (
          parsedMessage.question &&
          (!interview.questions.length ||
            interview.questions[interview.questions.length - 1].question !==
              parsedMessage.question)
        ) {
          // New question received - only add if different from last question
          parsedMessage.type = "question";
          const newQuestion = {
            question: parsedMessage.question,
            difficulty: parsedMessage.difficulty || "medium",
            answer: "",
            feedback: "",
          };
          interview.questions.push(newQuestion);

          // Send only question to frontend
          res.write(
            `data: ${JSON.stringify({
              type: "question",
              question: parsedMessage.question,
              questionNumber: interview.questions.length,
            })}\n\n`
          );
        } else if (parsedMessage.answer && interview.questions.length > 0) {
          // Answer received - update last question's answer
          parsedMessage.type = "answer";
          const lastIndex = interview.questions.length - 1;
          interview.questions[lastIndex].answer = parsedMessage.answer;
        } else if (parsedMessage.feedback && interview.questions.length > 0) {
          // Feedback received - update last question's feedback
          parsedMessage.type = "feedback";
          const lastIndex = interview.questions.length - 1;
          interview.questions[lastIndex].feedback = parsedMessage.feedback;
        } else if (parsedMessage.error) {
          parsedMessage.type = "error";
          res.write(`data: ${JSON.stringify(parsedMessage)}\n\n`);
        } else if (parsedMessage.status || parsedMessage.progress) {
          // Forward status/progress messages
          res.write(`data: ${JSON.stringify(parsedMessage)}\n\n`);
        }

        // Save to database (only if we made changes)
        if (["question", "answer", "feedback"].includes(parsedMessage.type)) {
          try {
            await interview.save();
          } catch (err) {
            if (err.name !== "ParallelSaveError") {
              console.error("Error saving interview:", err);
            }
          }
        }

        // Handle completion
        if (parsedMessage.complete) {
          interview.progress = "Completed";
          interview.completedAt = new Date();
          await interview.save();
          res.write(
            `data: ${JSON.stringify({
              type: "complete",
              message: "Interview completed",
            })}\n\n`
          );
        }
      } catch (error) {
        console.error("Error processing message:", error);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            error: "Error processing message",
            details: error.message,
          })}\n\n`
        );
      }
    });

    // Error handling
    shell.on("stderr", (stderr) => {
      console.error("Python stderr:", stderr);
      res.write(
        `data: ${JSON.stringify({
          type: "debug",
          message: stderr,
        })}\n\n`
      );
    });

    // Cleanup on script end
    shell.end(async (err) => {
      // clearTimeout(timeout);

      if (err) {
        console.error("Python script error:", err);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            error: "AI service failed: " + err.message,
          })}\n\n`
        );
      }

      interview.progress = "Completed";
      await interview
        .save()
        .catch((err) => console.error("Error finalizing interview:", err));

      res.write(
        `data: ${JSON.stringify({
          type: "complete",
          success: true,
          message: "Interview completed",
          interviewId: interview._id,
        })}\n\n`
      );

      res.end();
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

// Submit all answers and generate final feedback
exports.submitAnswers = async (req, res) => {
  try {
    const { interviewId, answers } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    // Update questions with answers
    for (let i = 0; i < answers.length; i++) {
      if (interview.questions[i]) {
        interview.questions[i].answer = answers[i];
      }
    }

    // Generate final feedback
    const finalFeedback = await generateFinalFeedback(interview.questions);
    interview.finalFeedback = finalFeedback;
    interview.progress = "Completed";
    await interview.save();

    res.status(200).json({ interview });
  } catch (error) {
    console.error("Error submitting answers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Initialize the Google Generative AI instance with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1);

const generateFinalFeedback = async (questions) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are an AI interviewer analyzing a candidate's performance in an interview.
      Based on the following questions and answers, provide a detailed final feedback report:
      - Strengths: Areas the candidate performed well in.
      - Weaknesses: Areas the candidate needs to improve.
      - Suggestions: Recommendations for improvement.

      Questions and Answers:
      ${questions
        .map(
          (q, i) =>
            `Q${i + 1}: ${q.question}\nA${i + 1}: ${
              q.answer || "No answer provided"
            }`
        )
        .join("\n\n")}
    `;

    const response = await model.generateContent(prompt);
    const result = await response.response.text();

    return { feedback: result };
  } catch (error) {
    console.error("Error generating final feedback:", error);
    return {
      feedback:
        "Error generating feedback. Please check the API key and try again.",
    };
  }
};

// Fetch all interviews for a user
exports.getUserInterviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const interviews = await Interview.find({ userId }).sort({ date: -1 });

    res.status(200).json({ interviews });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fetch details of a specific interview
exports.getInterviewDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.status(200).json({ interview });
  } catch (error) {
    console.error("Error fetching interview details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.startInterviewStream = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let count = 0;
  const interval = setInterval(() => {
    count++;
    res.write(
      `data: ${JSON.stringify({ message: "New question!", count })}\n\n`
    );

    if (count === 5) {
      // Stop after 5 messages
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
};
