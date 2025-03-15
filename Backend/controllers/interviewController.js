const { PythonShell } = require("python-shell");
const path = require("path");

const { PythonShell } = require("python-shell");
const path = require("path");

exports.startInterview = async (req, res) => {
  try {
    const { resumeText } = req.query; // Use query parameters for GET requests

    const pythonScript = path.join(
      __dirname,
      "../../AI-Interview/interview.py"
    );

    const options = {
      pythonOptions: ["-u"], // Unbuffered output
      args: [resumeText],
    };

    console.log("Starting Python script...");

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Flush headers to establish SSE connection

    const shell = new PythonShell(pythonScript, options);

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
      } catch (error) {
        console.error("Invalid JSON from Python:", message);
      }
    });

    shell.on("stderr", (stderr) => {
      console.error("Python stderr:", stderr);
    });

    shell.end((err) => {
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
      res.write(
        `data: ${JSON.stringify({
          success: true,
          message: "Interview completed",
        })}\n\n`
      );
      res.end(); // End the response
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
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    // Analyze the answer (use your existing `analyze_answer` function)
    const feedback = await analyzeAnswer(questionId, answer);

    res.status(200).json({ success: true, feedback });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
