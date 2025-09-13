import StatusSection from "./StatusSection";
import ControlButtons from "./ControlButtons";
import QuestionSection from "./QuestionSection";
import FeedbackSection from "./FeedbackSection";
import FinalFeedback from "./FinalFeedback";
import HistorySection from "./HistorySection";

const InterviewChat = ({
  status,
  progress,
  error,
  quationNumber,
  isInterviewActive,
  startInterview,
  stopInterview,
  currentQuestion,
  feedback,
  showFinalFeedback,
  finalFeedback,
  questions,
  currentAnswer,
  handleUserInput,
  submitAnswer,
}) => (
  <div className="interview-chat">
    <h2>AI Interview Session</h2>
    <StatusSection
      status={status}
      progress={progress}
      error={error}
      quationNumber={quationNumber}
    />
    <ControlButtons
      isInterviewActive={isInterviewActive}
      startInterview={startInterview}
      stopInterview={stopInterview}
    />
    {currentQuestion && (
      <QuestionSection
        currentQuestion={currentQuestion}
        currentAnswer={currentAnswer}
        handleUserInput={handleUserInput}
        submitAnswer={submitAnswer}
      />
    )}
    {feedback && <FeedbackSection feedback={feedback} />}
    {showFinalFeedback && finalFeedback && (
      <FinalFeedback finalFeedback={finalFeedback} />
    )}
    {questions.length > 0 && <HistorySection questions={questions} />}
  </div>
);

export default InterviewChat;