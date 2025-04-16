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
} = require("../controllers/interviewController.js");
const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected routes
router.get("/start", authMiddleware, startInterview);

module.exports = router;