const { PythonShell } = require("python-shell");
const path = require("path");

exports.startInterview = async (req, res) => {
  try {
    const { resumeText } = req.body;

    // Path to your Python script
    const pythonScript = path.join(
      __dirname,
      "../../AI-Interview/interview.py"
    );

    // Options for PythonShell
    const options = {
      mode: "json", // Expect JSON output
      pythonOptions: ["-u"], // Unbuffered output
      args: [resumeText], // Pass resume text to Python
    };
    console.log("Starting Python script...");

    // Run Python script
    PythonShell.run(pythonScript, options, (err, results) => {
      if (err) {
        console.error("Python error:", err);
        return res.status(500).json({ error: "AI service failed" });
      }
      console.log("Python script completed. Results:", results);

      // Check if results are valid JSON
      if (!results || !Array.isArray(results)) {
        return res
          .status(500)
          .json({ error: "Invalid response from AI service" });
      }
      console.log("Sending response to client...");

      // Send results back to frontend
      res.status(200).json({ success: true, data: results });
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
