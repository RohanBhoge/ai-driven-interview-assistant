// const express = require("express");
// const {
//   startInterview,
//   submitAnswer,
// } = require("../controllers/interviewController.js");
// const authMiddleware = require("../middleware/authMiddleware.js");

// const router = express.Router();

// // Protect route with authentication
// router.post("/start-interview", authMiddleware, startInterview);
// router.post("/submit-answer", authMiddleware, submitAnswer);

// module.exports = router;

const express = require("express");
const {
  startInterview,
  submitAnswers,
  getUserInterviews,
  getInterviewDetails,
  startInterviewStream,
} = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected routes
router.post("/start-interview", authMiddleware, startInterview);
router.get("/start-interview-stream", startInterviewStream);
router.post("/submit-answers", authMiddleware, submitAnswers);
router.get("/user-interviews/:userId", authMiddleware, getUserInterviews);
router.get("/interview/:id", authMiddleware, getInterviewDetails);

module.exports = router;
