import { useEffect, useState } from "react";
import axios from "axios";
import "./ProfileSection.css";

const ProfileSection = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/user/me`,
          {
            headers: {
              "x-auth-token": localStorage.getItem("token"),
            },
          }
        );
        setUser(response.data);
        console.log("User details:", response.data);
      } catch (error) {
        console.error(
          "Error fetching user details:",
          error.response?.data || error.message
        );
      }
    };

    fetchUserDetails();
  }, []);

  if (!user) {
    return <div>Loading...</div>;
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
        {/* {user.resume && (
          <p>
            <strong>Resume:</strong> <a href={user.resume}>Download</a>
          </p>
        )} */}
      </div>
    </div>
  );
};

export default ProfileSection;
