const express = require("express");
const {
  startInterview,
  getUserInterviews,
} = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected routes
router.get("/start", authMiddleware, startInterview);

router.get("/interviews", getUserInterviews);
<<<<<<< HEAD
router.post("/stop", authMiddleware, stopInterview);
=======
>>>>>>> parent of dd9b50c (Final Project Complition)
module.exports = router;
