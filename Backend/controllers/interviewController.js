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
    if (!token) return res.status(401).json({ error: "No token provided" });

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // 3. Get parameters
    const { userId, resumeText } = req.query;
    if (!userId || !resumeText) {
      return res.status(400).json({ error: "Missing userId or resumeText" });
    }

    // 4. Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Credentials": "true",
    });
    res.flushHeaders();

    // 5. Find user and create interview
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

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

    if (!Array.isArray(user.interviews)) user.interviews = [];
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

    // Message handling with lock mechanism
    let isProcessing = false;
    shell.on("message", async (message) => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const parsedMessage = JSON.parse(message);
        console.log("Received message from Python:", parsedMessage);

        // Skip duplicate questions
        if (
          parsedMessage.question &&
          interview.questions.length > 0 &&
          interview.questions[interview.questions.length - 1].question ===
            parsedMessage.question
        ) {
          isProcessing = false;
          return;
        }

        parsedMessage.timestamp = new Date().toISOString();

        if (parsedMessage.question) {
          interview.questions.push({
            question: parsedMessage.question,
            difficulty: parsedMessage.difficulty || "medium",
            answer: "",
            feedback: "",
          });
          res.write(
            `data: ${JSON.stringify({
              type: "question",
              question: parsedMessage.question,
              questionNumber: interview.questions.length,
            })}\n\n`
          );
        } else if (parsedMessage.answer && interview.questions.length > 0) {
          const lastIndex = interview.questions.length - 1;
          interview.questions[lastIndex].answer = parsedMessage.answer;
        } else if (parsedMessage.feedback && interview.questions.length > 0) {
          const lastIndex = interview.questions.length - 1;
          interview.questions[lastIndex].feedback = parsedMessage.feedback;
        } else if (
          parsedMessage.error ||
          parsedMessage.status ||
          parsedMessage.progress
        ) {
          res.write(`data: ${JSON.stringify(parsedMessage)}\n\n`);
        }

        // Save only if we have changes
        if (
          ["question", "answer", "feedback"].some((type) => parsedMessage[type])
        ) {
          await interview.save();
        }

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
      } finally {
        isProcessing = false;
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

    // Final cleanup and feedback generation
    shell.end(async (err) => {
      try {
        if (err) {
          console.error("Python script error:", err);
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              error: "AI service failed: " + err.message,
            })}\n\n`
          );
        }

        // Mark interview as completed
        interview.progress = "Completed";
        interview.completedAt = new Date();
        await interview.save();

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

              res.write(
                `data: ${JSON.stringify({
                  type: "complete",
                  success: true,
                  message: "Interview completed",
                  interviewId: interview._id,
                  finalFeedback: interview.finalFeedback,
                })}\n\n`
              );
            } catch (e) {
              console.error("Feedback parsing error:", e);
              // Provide default feedback if all parsing fails
              interview.finalFeedback = {
                strengths: "1. Candidate participated in the interview",
                weaknesses: "1. Technical knowledge needs improvement",
                suggestions:
                  "1. Review core concepts\n2. Practice explaining your projects",
              };
              await interview.save();

              res.write(
                `data: ${JSON.stringify({
                  type: "complete",
                  success: true,
                  message: "Interview completed (default feedback used)",
                  interviewId: interview._id,
                  finalFeedback: interview.finalFeedback,
                })}\n\n`
              );
            }
          });

          feedbackShell.end(() => res.end());
        } catch (feedbackError) {
          console.error("Feedback generation error:", feedbackError);
          res.write(
            `data: ${JSON.stringify({
              type: "complete",
              success: true,
              message: "Interview completed (feedback generation failed)",
              interviewId: interview._id,
            })}\n\n`
          );
          res.end();
        }
      } catch (finalError) {
        console.error("Final processing error:", finalError);
        res.end();
      }
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

