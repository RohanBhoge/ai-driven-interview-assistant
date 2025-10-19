import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import "./InterviewPage.css";
import { useInterview } from "../../context/InterviewContext";
import { EventSourcePolyfill } from "event-source-polyfill";
import { useAuth } from "../../context/AuthContext.jsx";
import Navbar from "../../components/NavBar/Navbar.jsx";
import WebcamRecorder from "./WebcamRecorder";
import InterviewChat from "./InterviewChat";

const initialState = {
  status: "Ready to start",
  questions: [],
  currentQuestion: null,
  currentAnswer: "",
  feedback: "",
  isInterviewActive: false,
  error: null,
  progress: "",
  interviewId: null,
  finalFeedback: null,
  showFinalFeedback: false,
  questionNumber: 0,
};

function interviewReducer(state, action) {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_QUESTIONS":
      return { ...state, questions: action.payload };
    case "ADD_QUESTION":
      return { ...state, questions: [...state.questions, action.payload] };
    case "UPDATE_LAST_QUESTION":
      return {
        ...state,
        questions: state.questions.map((q, i, arr) =>
          i === arr.length - 1 ? { ...q, ...action.payload } : q
        ),
      };
    case "SET_CURRENT_QUESTION":
      return { ...state, currentQuestion: action.payload };
    case "SET_CURRENT_ANSWER":
      return { ...state, currentAnswer: action.payload };
    case "SET_FEEDBACK":
      return { ...state, feedback: action.payload };
    case "SET_IS_INTERVIEW_ACTIVE":
      return { ...state, isInterviewActive: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_PROGRESS":
      return { ...state, progress: action.payload };
    case "SET_INTERVIEW_ID":
      return { ...state, interviewId: action.payload };
    case "SET_FINAL_FEEDBACK":
      return { ...state, finalFeedback: action.payload };
    case "SET_SHOW_FINAL_FEEDBACK":
      return { ...state, showFinalFeedback: action.payload };
    case "SET_QUESTION_NUMBER":
      return { ...state, questionNumber: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function InterviewComponent() {
  const { userId, token } = useAuth();
  const { text } = useInterview();
  const [state, dispatch] = useReducer(interviewReducer, initialState);
  const {
    status,
    questions,
    currentQuestion,
    currentAnswer,
    feedback,
    isInterviewActive,
    error,
    progress,
    interviewId,
    finalFeedback,
    showFinalFeedback,
  } = state;

  // Webcam recording state
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);

  const eventSourceRef = useRef(null);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      return stream;
    } catch {
      dispatch({
        type: "SET_ERROR",
        payload:
          "Could not access camera. Interview will continue without recording.",
      });
      return null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const stream = await startWebcam();
    if (!stream) return false;
    try {
      const options = {
        mimeType: 'video/webm; codecs="vp9,opus"',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start(1000);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      setIsRecording(true);
      return true;
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
  }, [startWebcam]);

  // Stop recording
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
          });
          resolve(blob);
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

  // Download video
  const downloadVideo = (blob) => {
    if (!blob) return;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Failed to download recording" });
    }
  };

  // Interview complete
  const handleInterviewComplete = useCallback(async () => {
    const videoBlob = await stopRecording();
    if (videoBlob) downloadVideo(videoBlob);
  }, []);

  // Start interview
  const startInterview = useCallback(async () => {
    try {
      dispatch({ type: "SET_STATUS", payload: "Starting interview..." });
      dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "SET_QUESTIONS", payload: [] });
      dispatch({ type: "SET_FINAL_FEEDBACK", payload: null });
      dispatch({ type: "SET_SHOW_FINAL_FEEDBACK", payload: false });
      const recordingStarted = await startRecording();
      if (!recordingStarted)
        dispatch({
          type: "SET_ERROR",
          payload: "Video recording failed - continuing without recording",
        });
      // Start interview via POST to AI API. The backend responds with interviewId
      // and also streams SSE on the same endpoint. We do a POST to initiate the
      // interview and then open an EventSource connection to receive SSE messages.
      if (eventSourceRef.current) eventSourceRef.current.close();
      const startResp = await fetch("/api/interview/ai/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ userId, resumeText: text }),
      });
      // If server returned non-200, throw
      if (!startResp.ok) {
        const errBody = await startResp.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to start interview");
      }
      // Open SSE connection to the same path; some servers accept SSE on the
      // same POST endpoint, but EventSource doesn't support POST, so append
      // interviewId as query param to receive the stream.
      const startJson = await startResp.json().catch(() => ({}));
      const sseUrl =
        startJson.sseUrl ||
        `/api/interview/ai/start?interviewId=${startJson.interviewId}`;
      const source = new EventSourcePolyfill(sseUrl, {
        headers: { "x-auth-token": token },
        withCredentials: true,
        heartbeatTimeout: 60000,
      });
      eventSourceRef.current = source;
      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.interviewId)
          dispatch({ type: "SET_INTERVIEW_ID", payload: data.interviewId });
        if (data.status) dispatch({ type: "SET_STATUS", payload: data.status });
        if (data.progress)
          dispatch({ type: "SET_PROGRESS", payload: data.progress });
        if (data.type === "question" && data.question) {
          dispatch({ type: "SET_CURRENT_QUESTION", payload: data.question });
          dispatch({
            type: "SET_QUESTION_NUMBER",
            payload: data.questionNumber,
          });
          dispatch({
            type: "ADD_QUESTION",
            payload: {
              question: data.question,
              difficulty: data.difficulty || "medium",
              answer: "",
              feedback: "",
            },
          });
        }
        if (data.type === "feedback" && data.feedback) {
          dispatch({ type: "SET_FEEDBACK", payload: data.feedback });
          dispatch({
            type: "UPDATE_LAST_QUESTION",
            payload: { feedback: data.feedback },
          });
        }
        if (data.type === "complete" && data.finalFeedback) {
          dispatch({ type: "SET_FINAL_FEEDBACK", payload: data.finalFeedback });
          dispatch({ type: "SET_SHOW_FINAL_FEEDBACK", payload: true });
          dispatch({ type: "SET_STATUS", payload: "Interview completed" });
          dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: false });
          handleInterviewComplete();
        }
        if (data.type === "error" && data.error) {
          dispatch({ type: "SET_ERROR", payload: data.error });
          source.close();
          handleInterviewComplete();
        }
        if (data.type === "complete" || data.complete) {
          dispatch({ type: "SET_STATUS", payload: "Interview completed" });
          dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: false });
          handleInterviewComplete();
          source.close();
        }
      };
      source.onerror = () => {
        dispatch({
          type: "SET_ERROR",
          payload: "Connection error. Please try again.",
        });
        dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: false });
        handleInterviewComplete();
        source.close();
      };
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to start interview",
      });
      dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: false });
      handleInterviewComplete();
    }
  }, [text, token, userId, handleInterviewComplete, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      stopRecording();
    };
  }, []);

  const handleUserInput = useCallback((e) => {
    dispatch({ type: "SET_CURRENT_ANSWER", payload: e.target.value });
  }, []);

  const submitAnswer = useCallback(() => {
    dispatch({
      type: "UPDATE_LAST_QUESTION",
      payload: { answer: currentAnswer },
    });
    dispatch({ type: "SET_CURRENT_ANSWER", payload: "" });
  }, [currentAnswer]);

  const stopInterview = async () => {
    try {
      dispatch({ type: "SET_STATUS", payload: "Stopping interview..." });
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      const response = await fetch("/api/interview/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ interviewId, userId }),
      });
      if (!response.ok) throw new Error("Failed to stop interview");
      const result = await response.json();
      if (result.success) {
        dispatch({
          type: "SET_STATUS",
          payload: "Interview stopped successfully",
        });
        dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: false });
        handleInterviewComplete();
      } else {
        throw new Error(result.error || "Failed to stop interview");
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to stop interview",
      });
      dispatch({ type: "SET_IS_INTERVIEW_ACTIVE", payload: false });
    }
  };

  return (
    <>
      <Navbar />
      <div className="interview-container">
        <div className="interview-content">
          <WebcamRecorder videoRef={videoRef} isRecording={isRecording} />
          <InterviewChat
            status={status}
            progress={progress}
            error={error}
            questionNumber={state.questionNumber}
            isInterviewActive={isInterviewActive}
            startInterview={startInterview}
            stopInterview={stopInterview}
            currentQuestion={currentQuestion}
            feedback={feedback}
            showFinalFeedback={showFinalFeedback}
            finalFeedback={finalFeedback}
            questions={questions}
            currentAnswer={currentAnswer}
            handleUserInput={handleUserInput}
            submitAnswer={submitAnswer}
          />
        </div>
      </div>
    </>
  );
}

export default function InterviewPage() {
  return <InterviewComponent />;
}
