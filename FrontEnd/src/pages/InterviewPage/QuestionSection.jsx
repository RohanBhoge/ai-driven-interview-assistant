const QuestionSection = ({ currentQuestion, currentAnswer, handleUserInput, submitAnswer }) => (
  <div className="question-section">
    <h3>Current Question:</h3>
    <p className="question">{currentQuestion}</p>
    <input
      type="text"
      value={currentAnswer}
      onChange={handleUserInput}
      placeholder="Type your answer..."
    />
    <button onClick={submitAnswer}>Submit Answer</button>
  </div>
);

export default QuestionSection;
