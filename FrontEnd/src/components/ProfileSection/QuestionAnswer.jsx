const QuestionAnswer = ({ question }) => (
  <li>
    <p>
      <strong>Q:</strong> {question.question}
    </p>
    <p>
      <strong>A:</strong> {question.answer || "Not answered"}
    </p>
    {question.feedback && (
      <p>
        <strong>Feedback:</strong> {question.feedback}
      </p>
    )}
  </li>
);

export default QuestionAnswer;