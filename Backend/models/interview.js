const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  interviewNumber: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  progress: {
    type: String,
    enum: ["Not Started", "In Progress", "Completed"],
    default: "Not Started",
  },
  questions: [
    {
      question: { type: String, required: true },
      answer: { type: String, default: "" },
      feedback: { type: String, default: "" },
    },
  ],
});

module.exports = mongoose.model("Interview", interviewSchema);
