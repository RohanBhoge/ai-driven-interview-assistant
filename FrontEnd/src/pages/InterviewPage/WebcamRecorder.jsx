const WebcamRecorder = ({ videoRef, isRecording }) => (
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
);

export default WebcamRecorder;
