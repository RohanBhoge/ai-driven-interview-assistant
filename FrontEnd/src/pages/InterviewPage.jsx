import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./InterviewPage.css";
import { useInterview } from "../context/InterviewContext";
import { EventSourcePolyfill } from "event-source-polyfill";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";

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
  const [finalFeedback, setFinalFeedback] = useState(null);
  const [showFinalFeedback, setShowFinalFeedback] = useState(false);

  // Webcam recording state
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);

  const eventSourceRef = useRef(null);

  // Initialize webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Could not access camera. Interview will continue without recording."
      );
      return null;
    }
  };

  // Start recording with proper MP4 format
  const startRecording = async () => {
    const stream = await startWebcam();
    if (!stream) return false;

    try {
      const options = {
        mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start(1000); // 1 second timeslices for metadata
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error("Error starting recording:", err);
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
  };

  // Stop recording and return the blob
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: "video/mp4",
          });
          resolve(blob);

          // Clean up media streams
          if (videoRef.current?.srcObject) {
            videoRef.current.srcObject
              .getTracks()
              .forEach((track) => track.stop());
          }
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
      setIsRecording(false);
    });
  };

  // Download the recorded video
  const downloadVideo = (blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-recording-${new Date().toISOString()}.mp4`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Handle interview completion
  const handleInterviewComplete = async () => {
    const videoBlob = await stopRecording();
    if (videoBlob) {
      downloadVideo(videoBlob);
    }
  };

  const startInterview = async () => {
    try {
      setStatus("Starting interview...");
      setIsInterviewActive(true);
      setError(null);
      setQuestions([]);
      setFinalFeedback(null);
      setShowFinalFeedback(false);

      // Start recording
      const recordingStarted = await startRecording();
      if (!recordingStarted) {
        setError("Video recording failed - continuing without recording");
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

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
          heartbeatTimeout: 60000,
        }
      );

      eventSourceRef.current = source;

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

        if (data.type === "complete" && data.finalFeedback) {
          setFinalFeedback(data.finalFeedback);
          setShowFinalFeedback(true);
          setStatus("Interview completed");
          setIsInterviewActive(false);
          handleInterviewComplete();
        }

        if (data.type === "error" && data.error) {
          setError(data.error);
          source.close();
          handleInterviewComplete();
        }

        if (data.type === "complete" || data.complete) {
          setStatus("Interview completed");
          setIsInterviewActive(false);
          handleInterviewComplete();
          source.close();
        }
      };

      source.onerror = (event) => {
        console.error("SSE error:", event);
        setError("Connection error. Please try again.");
        setIsInterviewActive(false);
        handleInterviewComplete();
        source.close();
      };
    } catch (error) {
      console.error("Error starting interview:", error);
      setError(error.message || "Failed to start interview");
      setIsInterviewActive(false);
      handleInterviewComplete();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      stopRecording();
    };
  }, []);

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
    <>
      <Navbar />
      <div className="interview-container">
        <div className="interview-content">
          <div className="webcam-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`webcam-feed ${isRecording ? "recording-active" : ""}`}
            />
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                Recording
              </div>
            )}
          </div>

          <div className="interview-chat">
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
                    value={currentAnswer}
                    onChange={handleUserInput}
                    placeholder="Type your answer here..."
                    rows={4}
                  />
                  <button onClick={submitAnswer}>Submit Answer</button>
                </div>
              </div>
            )}

            {feedback && (
              <div className="feedback-section">
                <h3>Feedback:</h3>
                <p>{feedback}</p>
              </div>
            )}

            {showFinalFeedback && finalFeedback && (
              <div className="final-feedback-section">
                <h3>Interview Summary</h3>
                <div className="feedback-category">
                  <h4>Strengths:</h4>
                  <div className="feedback-content">
                    {finalFeedback.strengths.split("\n").map((item, i) => (
                      <p key={i}>{item}</p>
                    ))}
                  </div>
                </div>
                <div className="feedback-category">
                  <h4>Areas for Improvement:</h4>
                  <div className="feedback-content">
                    {finalFeedback.weaknesses.split("\n").map((item, i) => (
                      <p key={i}>{item}</p>
                    ))}
                  </div>
                </div>
                <div className="feedback-category">
                  <h4>Suggestions:</h4>
                  <div className="feedback-content">
                    {finalFeedback.suggestions.split("\n").map((item, i) => (
                      <p key={i}>{item}</p>
                    ))}
                  </div>
                </div>
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
        </div>
      </div>
    </>
  );
};

export default InterviewComponent;
