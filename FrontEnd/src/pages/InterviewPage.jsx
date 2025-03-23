import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useInterview } from "../context/InterviewContext";

const StartInterview = () => {
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [eventSource, setEventSource] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const { userId, token } = useAuth(); // Get the userId and token from the context
  const { text } = useInterview(); // Get the resume text from the context

  const handleStartInterview = async () => {
    if (!text) {
      alert("Please enter your resume text.");
      return;
    }

    try {
      // Step 1: Send a POST request to start the interview
      const response = await fetch(
        "http://localhost:5000/api/interview/start-interview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token, // Include the token in the headers
          },
          body: JSON.stringify({ userId, resumeText: text }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      // Step 2: Initialize EventSource for real-time updates
      const eventSource = new EventSource(
        `http://localhost:5000/api/interview/start-interview-stream?userId=${userId}&resumeText=${encodeURIComponent(
          text
        )}&token=${token}` // Pass the token as a query parameter
      );

      setEventSource(eventSource);
      setInterviewStarted(true);

      // Listen for messages from the server
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.question) {
          // Update the current question
          setCurrentQuestion(data.question);
        } else if (data.error) {
          // Handle errors
          console.error("Error:", data.error);
          alert("Failed to start interview.");
          eventSource.close();
          setInterviewStarted(false);
        }
      };

      eventSource.onerror = (error) => {
        console.error("EventSource error:", error);
        eventSource.close();
        setInterviewStarted(false);
      };
    } catch (error) {
      console.error("Error starting interview:", error);
      alert("Failed to start interview.");
    }
  };

  const handleStopInterview = () => {
    if (eventSource) {
      eventSource.close();
      setInterviewStarted(false);
      setCurrentQuestion("");
      alert("Interview stopped.");
    }
  };

  // Cleanup EventSource on component unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return (
    <div>
      <h2>Start a New Interview</h2>
      <textarea
        placeholder="Paste your resume text here"
        value={text}
        readOnly // Make the textarea read-only since the text is fetched from context
      />
      <button onClick={handleStartInterview} disabled={interviewStarted}>
        Start Interview
      </button>
      <button onClick={handleStopInterview} disabled={!interviewStarted}>
        Stop Interview
      </button>

      {interviewStarted && currentQuestion && (
        <div>
          <h3>Current Question</h3>
          <p>{currentQuestion}</p>
        </div>
      )}
    </div>
  );
};

export default StartInterview;
