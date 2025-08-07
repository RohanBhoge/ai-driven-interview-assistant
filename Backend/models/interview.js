const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  resumeText: { type: String, required: true },
  date: { type: Date, default: Date.now },
  progress: {
    type: String,
    enum: ["Not Started", "In Progress", "Completed"],
    default: "Not Started",
  },
  questions: [
    {
      question: { type: String, required: true },
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
      },
      answer: { type: String, default: "" },
      feedback: { type: String, default: "" },
    },
  ],
});

module.exports = mongoose.model("Interview", interviewSchema);
