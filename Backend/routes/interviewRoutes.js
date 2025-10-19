const express = require("express");
const {
  startInterview,
  submitAnswer,
  getUserInterviews,
} = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected routes
router.get("/start", authMiddleware, startInterview);

router.get("/interviews", getUserInterviews);
router.post("/stop", authMiddleware, stopInterview);
module.exports = router;
