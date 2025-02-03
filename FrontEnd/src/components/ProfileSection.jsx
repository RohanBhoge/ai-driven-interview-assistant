import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProfileSection.css";

const ProfileSection = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/user/me", {
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        });
        setUser(response.data);
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    fetchUserDetails();
  }, []);

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/pdf/download/${filename}`,
        {
          responseType: "blob",
          headers: {
            "x-auth-token": localStorage.getItem("token"),
          },
        }
      );

      // Create a Blob from the PDF Stream
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      const tempLink = document.createElement("a");
      tempLink.href = fileURL;
      tempLink.setAttribute("download", filename);
      tempLink.click();
      URL.revokeObjectURL(fileURL);
      tempLink.remove();
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file.");
    }
  };

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
        {user.resume && (
          <p>
            <strong>Resume:</strong>{" "}
            <button onClick={() => handleDownload(user.resume.filename)}>
              Download
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileSection;
