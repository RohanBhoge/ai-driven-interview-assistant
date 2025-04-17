import { useEffect, useState } from "react";
import axios from "axios";
import "./ProfileSection.css";

const ProfileSection = () => {
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user details
        const userResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/me`,
          {
            headers: {
              "x-auth-token": localStorage.getItem("token"),
            },
          }
        );
        setUser(userResponse.data);

        // Fetch user's interviews
        const interviewsResponse = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/interview/interviews`,
          {
            headers: {
              "x-auth-token": localStorage.getItem("token"),
            },
          }
        );
        setInterviews(interviewsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error(
          "Error fetching data:",
          error.response?.data || error.message
        );
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Error loading user data</div>;
  }

  return (
    <div className="profile-section">
      <h2>Profile</h2>
      <div className="profile-details">
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
      </div>

      <div className="interview-history">
        <h3>Interview History</h3>
        {interviews.length === 0 ? (
          <p>No interviews found</p>
        ) : (
          <div className="interview-list">
            {interviews.map((interview) => (
              <div key={interview._id} className="interview-card">
                <div className="interview-header">
                  <h4>Interview #{interview.interviewNumber}</h4>
                  <span
                    className={`status-badge ${
                      interview.progress === "Completed"
                        ? "completed"
                        : interview.progress === "In Progress"
                        ? "in-progress"
                        : "not-started"
                    }`}
                  >
                    {interview.progress}
                  </span>
                </div>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(interview.date).toLocaleDateString()}
                </p>

                <div className="questions-section">
                  <h5>Questions & Answers:</h5>
                  <ul>
                    {interview.questions.map((q, index) => (
                      <li key={index}>
                        <p>
                          <strong>Q:</strong> {q.question}
                        </p>
                        <p>
                          <strong>A:</strong> {q.answer || "Not answered"}
                        </p>
                        {q.feedback && (
                          <p>
                            <strong>Feedback:</strong> {q.feedback}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {interview.finalFeedback && (
                  <div className="final-feedback">
                    <h5>Final Feedback:</h5>
                    <div>
                      <p>
                        <strong>Strengths:</strong>{" "}
                        {interview.finalFeedback.strengths}
                      </p>
                      <p>
                        <strong>Weaknesses:</strong>{" "}
                        {interview.finalFeedback.weaknesses}
                      </p>
                      <p>
                        <strong>Suggestions:</strong>{" "}
                        {interview.finalFeedback.suggestions}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSection;
