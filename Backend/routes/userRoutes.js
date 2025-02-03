const express = require("express");
const authMiddleware = require("../middleware/authMiddleware.js");
const User = require("../models/user.js");

const router = express.Router();
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
