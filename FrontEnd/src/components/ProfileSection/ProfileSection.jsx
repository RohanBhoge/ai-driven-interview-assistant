import { useEffect, useState } from "react";
import axios from "axios";
import "./ProfileSection.css";
import ProfileDetails from "./ProfileDetails";
import InterviewHistory from "./InterviewHistory";

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
      <ProfileDetails user={user} />
      <InterviewHistory interviews={interviews} />
    </div>
  );
};

export default ProfileSection;