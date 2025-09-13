// const Interview = require("../models/interview.js");
// const AiServices = require("../services/aiService.js");

// const startInterview = async (ws, req) => {
//   const { resumeText, userId } = req.body;

//   const firstQuestionText = await AiServices.generateQuestion(
//     resumeText,
//     "medium",
//     []
//   );
//   ws.send(firstQuestionText);

//   ws.on("message", async (msg) => {
//     const Feedback = AiServices.analyzeAnswer(questionText, msg);

//     const difficulty = Feedback.nextDifficulty;
//     const interview = new Interview({
//       userId,
//       resumeText,
//       questions: [
//         {
//           question: questionText,
//           difficulty: "medium",
//           answer: msg,
//           feedback: Feedback.feedback,
//         },
//       ],
//       progress: "In Progress",
//     });

//     await interview.save();

//     const interviewId = Interview._id;

//     const askedQuations = await Interview.findOne(interviewId);

//     const nextQuation = await AiServices.generateQuestion(
//       resumeText,
//       difficulty,
//       askedQuations.questions
//     );

//     ws.send(nextQuation);
//   });
// };

// controllers/interviewController.js

const Interview = require("../models/interview.js");
const AiService = require("../services/aiService.js");

const MAX_QUESTIONS = 2; // Define a constant for the number of questions

/**
 * Handles the initial WebSocket connection and routes incoming messages.
 * This is the main entry point for the WebSocket route.
 * @param {WebSocket} ws - The WebSocket connection instance for a specific client.
 * @param {object} req - The initial HTTP request object.
 */

const handleInterviewConnection = async (ws, req) => {
  console.log("Client connected for an interview session.");

  // Attach state variables directly to the WebSocket instance for this session
  ws.interviewState = {
    interviewId: null,
    currentQuestion: null,
    questionNumber: 0,
  };

  const firstQuestion = await handleStartInterview(ws, {
    resumeText: "Experienced in Node.js and React.",
    userId: "67a6f36d0fefca10b05a1fae",
  });

  ws.send(firstQuestion);

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      // Route client messages to the appropriate handler
      switch (data.type) {
        case "start_interview":
          await handleStartInterview(ws, data.payload);
          break;
        case "submit_answer":
          await handleSubmitAnswer(ws, data.payload);
          break;
        case "end_interview":
          await handleEndInterview(ws, data.payload);
          break;
        default:
          sendJson(ws, { type: "error", message: "Unknown command." });
      }
    } catch (error) {
      console.error("Invalid message format:", error);
      sendJson(ws, {
        type: "error",
        message: "Invalid message format. Expecting JSON.",
      });
    }
  });

  ws.on("close", () => {
    console.log(
      `Client disconnected. Interview ID: ${
        ws.interviewState.interviewId || "N/A"
      }`
    );
    // Optional: Add cleanup logic here, like marking an incomplete interview as 'Abandoned'.
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
};

/**
 * Initializes the interview, generates the first question, and saves the session.
 * @param {WebSocket} ws - The WebSocket connection instance.
 * @param {object} payload - The data payload from the client.
 */

async function handleStartInterview(ws, payload) {
  try {
    const { resumeText, userId } = payload;

    // 1. Validate Input
    if (!resumeText || !userId) {
      return sendJson(ws, {
        type: "error",
        message: "Resume text and userId are required.",
      });
    }

    // 2. Generate the first question
    const firstQuestionText = await AiService.generateQuestion(
      resumeText,
      "medium",
      []
    );
    ws.interviewState.currentQuestion = firstQuestionText;
    ws.interviewState.questionNumber = 1;

    // 3. Create and save the new interview document
    const interview = new Interview({
      userId,
      resumeText,
      questions: [
        {
          question: firstQuestionText,
          difficulty: "medium",
        },
      ],
      progress: "In Progress",
    });

    await interview.save();

    // 4. Store the interview ID for the rest of the session
    ws.interviewState.interviewId = interview._id;

    console.log(interview._id);

    const audioUrl = await AiService.synthesizeSpeech(firstQuestionText);

    // 5. Send the first question to the client
    sendJson(ws, {
      type: "interview_started",
      payload: {
        question: firstQuestionText,
        audioUrl: audioUrl, // <-- NEW
        questionNumber: ws.interviewState.questionNumber,
        totalQuestions: MAX_QUESTIONS,
      },
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    sendJson(ws, {
      type: "error",
      message: "Could not start the interview. Please try again.",
    });
  }
}

/**
 * Analyzes the user's answer, saves progress, and generates the next question.
 * @param {WebSocket} ws - The WebSocket connection instance.
 * @param {object} payload - The data payload from the client.
 */

async function handleSubmitAnswer(ws, payload) {
  try {
    const { answer } = payload;
    const { interviewId, currentQuestion, questionNumber } = ws.interviewState;

    // 1. Validate State
    if (!interviewId) {
      return sendJson(ws, {
        type: "error",
        message: "Interview has not been started.",
      });
    }

    if (questionNumber >= MAX_QUESTIONS) {
      // Handle final answer and end interview
      await handleEndInterview(ws, answer);
      return;
    }

    // 2. Analyze the answer and get feedback
    const analysis = await AiService.analyzeAnswer(currentQuestion, answer);

    // 3. Update the interview document with the new answer and feedback.
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return sendJson(ws, {
        type: "error",
        message: "Interview session not found.",
      });
    }

    // Find the last question and update it
    const lastQuestion = interview.questions[interview.questions.length - 1];
    if (!lastQuestion) {
      return sendJson(ws, {
        type: "error",
        message: "No questions found in the interview.",
      });
    }
    lastQuestion.answer = answer;
    lastQuestion.feedback = analysis.feedback;

    // 4. Generate the next question
    const askedQuestions = interview.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
    }));

    console.log(askedQuestions);

    const nextAudioUrl = await AiService.synthesizeSpeech(nextQuestionText);

    const nextQuestionText = await AiService.generateQuestion(
      interview.resumeText,
      analysis.nextDifficulty,
      askedQuestions
    );

    // 5. Add the new question to the document
    interview.questions.push({
      question: nextQuestionText,
      difficulty: analysis.nextDifficulty,
    });
    await interview.save();

    // 6. Update session state and send the next question to the client
    ws.interviewState.currentQuestion = nextQuestionText;
    ws.interviewState.questionNumber++;

    sendJson(ws, {
      type: "next_question",
      payload: {
        question: nextQuestionText,
        questionNumber: ws.interviewState.questionNumber,
        totalQuestions: MAX_QUESTIONS,
      },
    });
  } catch (error) {
    console.error("Error processing answer:", error);
    sendJson(ws, {
      type: "error",
      message: "Could not process your answer. Please try again.",
    });
  }
}

/**
 * Handles the end of the interview.
 * @param {WebSocket} ws - The WebSocket connection instance.
 */

async function handleEndInterview(ws, finalAnswer) {
  try {
    const { interviewId } = ws.interviewState;
    console.log(`Interview ${interviewId} is ending.`);

    // 1. Find the interview document
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return sendJson(ws, {
        type: "error",
        message: "Could not find interview to end.",
      });
    }

    // 2. Save the final answer to the last question
    const lastQuestion = interview.questions[interview.questions.length - 1];
    if (lastQuestion) {
      lastQuestion.answer = finalAnswer;
    }

    // 3. Generate final feedback
    const qaPairs = interview.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
    }));

    const feedback = await AiService.generateFinalFeedback(qaPairs);

    // 4. Save the feedback and update progress
    interview.finalFeedback = feedback;
    interview.progress = "Completed";
    await interview.save();

    // 5. Send the final feedback to the client
    sendJson(ws, {
      type: "final_feedback",
      payload: feedback,
    });

    // 6. Close the connection gracefully
    ws.close(1000, "Interview completed successfully.");
  } catch (error) {
    console.error("Error during handleEndInterview:", error);
    sendJson(ws, {
      type: "error",
      message: "An error occurred while finalizing the interview.",
    });

    ws.close(1011, "An internal error occurred."); // 1011 is internal server error
  }
}

/**
 * A robust wrapper for ws.send that stringifies JSON and handles errors.
 * @param {WebSocket} ws
 * @param {object} data
 */
function sendJson(ws, data) {
  try {
    ws.send(JSON.stringify(data));
  } catch (error) {
    console.error("Failed to send JSON message:", error);
  }
}

module.exports = { handleInterviewConnection };
