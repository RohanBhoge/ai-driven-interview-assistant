const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User"); // Import User model

const router = express.Router();

// Fetch user details
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
