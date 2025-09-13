const FinalFeedback = ({ finalFeedback }) => (
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
);

export default FinalFeedback;
