import StatusBadge from "./StatusBadge";
import QuestionAnswer from "./QuestionAnswer";

const InterviewCard = ({ interview }) => (
  <div className="interview-card">
    <div className="interview-header">
      <h4>Interview #{interview.interviewNumber}</h4>
      <StatusBadge progress={interview.progress} />
    </div>
    <p>
      <strong>Date:</strong> {new Date(interview.date).toLocaleDateString()}
    </p>
    <div className="questions-section">
      <h5>Questions & Answers:</h5>
      <ul>
        {interview.questions.map((q, index) => (
          <QuestionAnswer key={index} question={q} />
        ))}
      </ul>
    </div>
    {interview.finalFeedback && (
      <div className="final-feedback">
        <h5>Final Feedback:</h5>
        <div>
          <p>
            <strong>Strengths:</strong> {interview.finalFeedback.strengths}
          </p>
          <p>
            <strong>Weaknesses:</strong> {interview.finalFeedback.weaknesses}
          </p>
          <p>
            <strong>Suggestions:</strong> {interview.finalFeedback.suggestions}
          </p>
        </div>
      </div>
    )}
  </div>
);

export default InterviewCard;