const app = require("./app"); // Import your Express app
const dotenv = require("dotenv");
const { startInterview } = require("./controllers/interviewController");
const interviewModel = require("./ai/InterviewModel");

dotenv.config();

const PORT = process.env.PORT || 5000;

// Attach routes provided by the interview model (CommonJS)
if (interviewModel && typeof interviewModel.attachInterviewRoutes === "function") {
  interviewModel.attachInterviewRoutes(app);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
