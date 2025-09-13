import InterviewCard from "./InterviewCard";

const InterviewHistory = ({ interviews }) => (
  <div className="interview-history">
    <h3>Interview History</h3>
    {interviews.length === 0 ? (
      <p>No interviews found</p>
    ) : (
      <div className="interview-list">
        {interviews.map((interview) => (
          <InterviewCard key={interview._id} interview={interview} />
        ))}
      </div>
    )}
  </div>
);

export default InterviewHistory;