import { useRef, useEffect } from "react";
import "./WebcamRecorder.css";

const WebcamRecorder = ({ isRecording, onRecordingComplete }) => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    let stream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && videoRef.current?.srcObject) {
      const startRecording = () => {
        const stream = videoRef.current.srcObject;
        const options = { mimeType: "video/webm;codecs=vp9,opus" };

        mediaRecorderRef.current = new MediaRecorder(stream, options);
        recordedChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
          });
          const url = URL.createObjectURL(blob);
          if (onRecordingComplete) {
            onRecordingComplete(url, blob);
          }
        };

        mediaRecorderRef.current.start(1000); // Collect data every second
      };

      startRecording();
    } else if (
      !isRecording &&
      mediaRecorderRef.current?.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording, onRecordingComplete]);

  return (
    <div className="webcam-recorder">
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
  );
};

export default WebcamRecorder;
