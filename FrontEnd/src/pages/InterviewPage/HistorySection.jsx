const HistorySection = ({ questions }) => (
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
);

export default HistorySection;
