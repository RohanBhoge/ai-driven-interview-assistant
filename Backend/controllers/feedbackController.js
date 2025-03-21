const Interview = require("../models/Interview");

exports.generateFinalFeedback = async (req, res) => {
  try {
    const { interviewId } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: "Interview not found" });
    }

    const finalFeedback = await generateFinalFeedback(interview.questions);
    interview.finalFeedback = finalFeedback;
    await interview.save();

    res.status(200).json({ interview });
  } catch (error) {
    console.error("Error generating final feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
