const StatusSection = ({ status, progress, error, questionNumber }) => (
  <div className="status-section">
    <p>
      <strong>Status:</strong> {status}
    </p>
    {progress && (
      <p>
        <strong>Progress:</strong> Question{" "}
        {questionNumber ? questionNumber : 0}/5
      </p>
    )}
    {error && <p className="error-message">{error}</p>}
  </div>
);

export default StatusSection;
