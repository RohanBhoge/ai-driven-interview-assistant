const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PythonShell } = require("python-shell");
const path = require("path");
const Interview = require("../models/interview.js");
const User = require("../models/User.js");

exports.startInterview = async (req, res) => {
  try {
    const { userId, resumeText } = req.body;

    if (!userId || !resumeText) {
      return res.status(400).json({ error: "Missing userId or resumeText" });
    }

    console.log("Received userId:", userId);

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get the last interview number
    const lastInterview = await Interview.findOne({ userId }).sort({
      interviewNumber: -1,
    });
    const interviewNumber = lastInterview
      ? lastInterview.interviewNumber + 1
      : 1;

    // Create a new interview
    const interview = new Interview({
      userId,
      interviewNumber,
      questions: [],
      progress: "In Progress",
    });

    await interview.save();

    // Ensure user.interviews exists before pushing
    if (!Array.isArray(user.interviews)) {
      user.interviews = [];
    }

    user.interviews.push(interview._id);
    await user.save();

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Flush headers to establish SSE connection

    const pythonScript = path.join(
      __dirname,
      "../../AI-Interview/interview.py"
    );
    const options = {
      pythonOptions: ["-u"], // Unbuffered output
      args: [resumeText],
    };

    console.log("Starting Python script...");

    const shell = new PythonShell(pythonScript, options);

    // Timeout handling
    const timeout = setTimeout(() => {
      console.error("Python script timed out");
      res.write(
        `data: ${JSON.stringify({
          success: false,
          error: "Python script timed out",
        })}\n\n`
      );
      res.end(); // End the response
      shell.terminate(); // Stop the script
    }, 120000); // Increase timeout to 120 seconds (2 minutes)

    shell.on("message", (message) => {
      try {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.error) {
          console.error("Python error:", parsedMessage.error);
          res.write(
            `data: ${JSON.stringify({
              success: false,
              error: parsedMessage.error,
            })}\n\n`
          );
          res.end(); // End the response
          shell.terminate(); // Stop script
          return;
        }

        console.log("Python message:", parsedMessage);

        // Send each message to the frontend in real-time
        res.write(`data: ${JSON.stringify(parsedMessage)}\n\n`);

        // Save the question to the interview
        if (parsedMessage.question) {
          interview.questions.push({ question: parsedMessage.question });
          interview.save();
        }
      } catch (error) {
        console.error("Invalid JSON from Python:", message);
      }
    });

    shell.on("stderr", (stderr) => {
      console.error("Python stderr:", stderr);
    });

    shell.end(async (err) => {
      clearTimeout(timeout); // Clear the timeout

      if (err) {
        console.error("Python script error:", err);
        res.write(
          `data: ${JSON.stringify({
            success: false,
            error: "AI service failed",
          })}\n\n`
        );
        res.end(); // End the response
        return;
      }

      console.log("Python script completed. Sending final response...");

      // Send the final response
      res.write(
        `data: ${JSON.stringify({
          success: true,
          message: "Interview completed",
        })}\n\n`
      );
      console.log("Interview completed 1");

      // Close the SSE connection
      res.end();
      console.log("Interview completed 2");

      // Update the interview progress to "Completed"
      interview.progress = "Completed";
      console.log("Interview completed 2.1");
      await interview.save();
      console.log("Interview completed 2.2");
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    res.write(
      `data: ${JSON.stringify({
        success: false,
        error: "Internal server error",
      })}\n\n`
    );
    res.end(); // End the response
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
    console.log(process.env.GEMINI_API_KEY_1);
    await interview.save();

    res.status(200).json({ interview });
  } catch (error) {
    console.error("Error submitting answers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Generate final feedback

// Initialize the Google Generative AI instance with your API key

const genAI = new GoogleGenerativeAI(`${process.env.GEMINI_API_KEY_1}`);

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
        .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
        .join("\n")}
    `;

    const response = await model.generateContent(prompt);
    const result = await response.response.text();

    return { feedback: result }; // Return an object instead of a string
  } catch (error) {
    console.error("Error generating final feedback:", error);
    return {
      feedback:
        "Error generating feedback. Please check the API key and try again.",
    }; // Return an object
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

const jwt = require("jsonwebtoken");

exports.startInterviewStream = async (req, res) => {
  try {
    const { userId, resumeText, token } = req.query;

    if (!userId || !resumeText || !token) {
      return res
        .status(400)
        .json({ error: "Missing userId, resumeText, or token" });
    }

    // Validate the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("Streaming interview questions for userId:", userId);

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Flush headers to establish SSE connection

    // Simulate sending a question
    res.write(
      `data: ${JSON.stringify({
        question: "What is your experience with React?",
      })}\n\n`
    );

    // Simulate sending another question after 5 seconds
    setTimeout(() => {
      res.write(
        `data: ${JSON.stringify({
          question:
            "Can you explain the difference between props and state in React?",
        })}\n\n`
      );
    }, 5000);

    // Simulate interview completion after 10 seconds
    setTimeout(() => {
      res.write(
        `data: ${JSON.stringify({
          success: true,
          message: "Interview completed",
        })}\n\n`
      );
      res.end();
    }, 10000);
  } catch (error) {
    console.error("Error streaming interview questions:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Internal server error" })}\n\n`
    );
    res.end();
  }
};
