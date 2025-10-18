const express = require("express");
const {
  startInterview,
  submitAnswer,
  getUserInterviews,
  stopInterview,
} = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected routes
router.post("/start", authMiddleware, startInterview);
router.post("/submit", authMiddleware, submitAnswer);
router.post("/stop", authMiddleware, stopInterview);
router.get("/interviews", authMiddleware, getUserInterviews);

module.exports = router;