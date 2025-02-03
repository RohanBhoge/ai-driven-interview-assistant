const User = require("../models/User.js");
const pdf = require("pdf-parse");
const fs = require("fs");
// Upload and extract text from PDF
const uploadPDF = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    // Save the file path to the user's document
    const user = await User.findById(req.userId);
    user.resume = req.file.path;
    await user.save();
    fs.unlinkSync(req.file.path); // Delete the file after processing
    res.json({ text: data.text });
  } catch (error) {
    console.error("Error extracting text:", error);
    res.status(500).json({ message: "Failed to extract text from PDF." });
  }
};
module.exports = { uploadPDF };
