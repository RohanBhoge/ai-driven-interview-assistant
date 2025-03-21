import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useInterview } from "../context/InterviewContext";

const InterviewPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const { text } = useInterview();
  const [interviewStarted, setInterviewStarted] = useState(false); // Track interview start

  useEffect(() => {
    if (!interviewStarted) return; // Prevent auto-start

    const eventSource = new EventSource(
      `http://localhost:5000/api/interview/start-interview?resumeText=${encodeURIComponent(
        text
      )}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        console.error("Error:", data.error);
      } else if (data.type === "question") {
        console.log("Question:", data.text);
        setCurrentQuestion(data);
      } else if (data.type === "feedback") {
        console.log("Feedback:", data.text);
      } else if (data.success) {
        console.log("Interview completed:", data.message);
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [text, interviewStarted]); // Dependency includes `interviewStarted`

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/interview/start-interview",
        { resumeText: text },
        { headers: { "x-auth-token": token } }
      );
      setCurrentQuestion(response.data.data[0]);
      setInterviewStarted(true); // Now allow eventSource to start
    } catch (error) {
      console.error("Error starting interview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Interview</h1>

      {!currentQuestion ? (
        <button
          onClick={startInterview}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {isLoading ? "Starting..." : "Start Interview"}
        </button>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">
            Question {currentQuestion.step}:
          </h2>
          <p className="my-2">{currentQuestion.text}</p>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
