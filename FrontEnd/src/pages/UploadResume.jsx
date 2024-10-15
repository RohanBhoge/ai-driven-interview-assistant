import React, { useState } from "react";
import "./UploadResume.css";

function UploadResume() {
  const [resume, setResume] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    // Call API to upload resume
  };

  return (
    <div>
      <h1>Upload Resume</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={(event) => setResume(event.target.files[0])}
        />
        <button type="submit">Upload Resume</button>
      </form>
    </div>
  );
}

export default UploadResume;
