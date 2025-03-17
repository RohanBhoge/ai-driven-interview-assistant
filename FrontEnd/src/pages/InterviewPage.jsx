import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useInterview } from "../context/InterviewContext";

const InterviewPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const { text } = useInterview();

  // Initialize EventSource only once
  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:5000/api/interview/start-interview?resumeText=${encodeURIComponent(
        text
      )}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        console.error("Error:", data.error);
        // Display error on the screen
      } else if (data.type === "question") {
        console.log("Question:", data.text);
        setQuestions((prev) => [...prev, data]); // Add question to the list
      } else if (data.type === "feedback") {
        console.log("Feedback:", data.text);
        // Display feedback on the screen
      } else if (data.success) {
        console.log("Interview completed:", data.message);
        eventSource.close(); // Close the connection
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close(); // Close the connection
    };

    // Cleanup function to close EventSource when the component unmounts
    return () => {
      eventSource.close();
    };
  }, [text]); // Re-run effect if `text` changes

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/interview/start-interview",
        {
          resumeText: text,
        },
        {
          headers: {
            "x-auth-token": token,
          },
        }
      );
      setQuestions(response.data.data);
      console.log(response.data.data);
    } catch (error) {
      console.error("Error starting interview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Interview</h1>

      {questions.length === 0 ? (
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
            Question {currentQuestion + 1}:
          </h2>
          <p className="my-2">{questions[currentQuestion].text}</p>

          <button
            onClick={() => setCurrentQuestion((prev) => prev + 1)}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Next Question
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
