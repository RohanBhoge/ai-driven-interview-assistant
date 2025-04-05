import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./InterviewPage.css";
import { useInterview } from "../context/InterviewContext";
import { EventSourcePolyfill } from "event-source-polyfill";
import { useAuth } from "../context/AuthContext.jsx";
const InterviewComponent = () => {
  const { userId, token } = useAuth();
  const { text } = useInterview();
  const [status, setStatus] = useState("Ready to start");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [interviewId, setInterviewId] = useState(null);

  const eventSourceRef = useRef(null);

  const startInterview = async () => {
    try {
      setStatus("Starting interview...");
      setIsInterviewActive(true);
      setError(null);
      setQuestions([]);

      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create an authenticated SSE connection
      const source = new EventSourcePolyfill(
        `/api/interview/start?userId=${userId}&resumeText=${encodeURIComponent(
          text
        )}`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
          withCredentials: true,
          heartbeatTimeout: 60000, // 5 minutes timeout
        }
      );

      eventSourceRef.current = source;

      // Handle different types of events
      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received SSE event:", data);

        if (data.interviewId) {
          setInterviewId(data.interviewId);
        }

        if (data.status) {
          setStatus(data.status);
        }

        if (data.progress) {
          setProgress(data.progress);
        }

        if (data.type === "question" && data.question) {
          setCurrentQuestion(data.question);
          setQuestions((prevQuestions) => [
            ...prevQuestions,
            {
              question: data.question,
              difficulty: data.difficulty || "medium",
              answer: "",
              feedback: "",
            },
          ]);
        }

        if (data.type === "feedback" && data.feedback) {
          setFeedback(data.feedback);
          setQuestions((prevQuestions) => {
            const updated = [...prevQuestions];
            if (updated.length > 0) {
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                ...updated[lastIndex],
                feedback: data.feedback,
              };
            }
            return updated;
          });
        }

        if (data.type === "error" && data.error) {
          setError(data.error);
          source.close();
        }

        if (data.type === "complete" || data.complete) {
          setStatus("Interview completed");
          setIsInterviewActive(false);
          source.close();
        }
      };

      source.onerror = (event) => {
        console.error("SSE error:", event);
        setError("Connection error. Please try again.");
        setIsInterviewActive(false);
        source.close();
      };
    } catch (error) {
      console.error("Error starting interview:", error);
      setError(error.message || "Failed to start interview");
      setIsInterviewActive(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Rest of your component remains the same...
  const handleUserInput = (e) => {
    setCurrentAnswer(e.target.value);
  };

  const submitAnswer = () => {
    setQuestions((prevQuestions) => {
      const updated = [...prevQuestions];
      if (updated.length > 0) {
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          answer: currentAnswer,
        };
      }
      return updated;
    });
    setCurrentAnswer("");
  };

  return (
    <div className="interview-container">
      <h2>AI Interview Session</h2>

      <div className="status-section">
        <p>
          <strong>Status:</strong> {status}
        </p>
        {progress && (
          <p>
            <strong>Progress:</strong> {progress}
          </p>
        )}
        {error && <p className="error-message">{error}</p>}
      </div>

      <div className="controls">
        {!isInterviewActive ? (
          <button onClick={startInterview}>Start Interview</button>
        ) : (
          <button disabled>Interview in Progress</button>
        )}
      </div>

      {currentQuestion && (
        <div className="question-section">
          <h3>Current Question:</h3>
          <p className="question">{currentQuestion}</p>

          <div className="answer-input">
            <textarea
              placeholder="Your answer..."
              value={currentAnswer}
              onChange={handleUserInput}
              disabled={!isInterviewActive}
            />
            <button
              onClick={submitAnswer}
              disabled={!isInterviewActive || !currentAnswer.trim()}
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="feedback-section">
          <h3>Feedback:</h3>
          <p>{feedback}</p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="history-section">
          <h3>Interview History:</h3>
          {questions.map((item, index) => (
            <div key={index} className="qa-item">
              <p className="question-history">
                <strong>Q{index + 1}:</strong> {item.question}
              </p>
              {item.answer && (
                <p className="answer-history">
                  <strong>A:</strong> {item.answer}
                </p>
              )}
              {item.feedback && (
                <p className="feedback-history">
                  <strong>Feedback:</strong> {item.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewComponent;
