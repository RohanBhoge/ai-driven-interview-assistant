const express = require("express");
const { startInterview } = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protect route with authentication
router.post("/start-interview", authMiddleware, startInterview);

module.exports = router;
