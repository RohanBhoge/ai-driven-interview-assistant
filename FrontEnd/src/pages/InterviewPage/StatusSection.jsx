const StatusSection = ({ status, progress, error, quationNumber }) => (
  <div className="status-section">
    <p>
      <strong>Status:</strong> {status}
    </p>
    {progress && (
      <p>
        <strong>Progress:</strong>Quation {quationNumber ? quationNumber : 0}/5
      </p>
    )}
    {error && <p className="error-message">{error}</p>}
  </div>
);

export default StatusSection;
