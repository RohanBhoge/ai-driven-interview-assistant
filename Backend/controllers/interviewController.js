const { PythonShell } = require("python-shell");
const path = require("path");

exports.startInterview = async (req, res) => {
  try {
    const { resumeText } = req.body;

    const pythonScript = path.join(
      __dirname,
      "../../AI-Interview/interview.py"
    );

    const options = {
      pythonOptions: ["-u"], // Unbuffered output
      args: [resumeText],
    };

    console.log("Starting Python script...");

    let resultData = [];
    let responseSent = false; // Flag to track if response is already sent

    const shell = new PythonShell(pythonScript, options);

    shell.on("message", (message) => {
      try {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.error) {
          console.error("Python error:", parsedMessage.error);

          if (!responseSent) {
            responseSent = true;
            shell.terminate(); // Stop script
            return res
              .status(400)
              .json({ success: false, error: parsedMessage.error });
          }
        }

        console.log("Python message:", parsedMessage);
        resultData.push(parsedMessage);
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
        if (!responseSent) {
          responseSent = true;
          return res.status(500).json({ error: "AI service failed" });
        }
      }

      if (!responseSent) {
        responseSent = true;
        console.log("Python script completed. Sending response...");
        res.status(200).json({ success: true, data: resultData });
      }
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    if (!responseSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
