const ControlButtons = ({ isInterviewActive, startInterview, stopInterview }) => (
  <div className="controls">
    {!isInterviewActive ? (
      <button onClick={startInterview}>Start Interview</button>
    ) : (
      <div className="interview-controls">
        <button onClick={stopInterview}>Stop Interview</button>
      </div>
    )}
  </div>
);

export default ControlButtons;
