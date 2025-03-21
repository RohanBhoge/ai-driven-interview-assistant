const express = require("express");
const { generateFinalFeedback } = require("../controllers/feedbackController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protected routes
router.post("/generate-feedback", authMiddleware, generateFinalFeedback);

module.exports = router;