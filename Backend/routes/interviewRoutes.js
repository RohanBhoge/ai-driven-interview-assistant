const express = require("express");
const {
  startInterview,
  getUserInterviews,
} = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected routes
// Note: the AI-specific interview endpoints are mounted under
// /api/interview/ai/* by Backend/ai/InterviewModel.js. The controller-backed
// SSE start endpoint remains available at GET /api/interview/start (controller).
router.get("/start", authMiddleware, startInterview);

router.get("/interviews", getUserInterviews);
module.exports = router;
