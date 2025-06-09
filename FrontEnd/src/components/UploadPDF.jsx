import { useState } from "react";
import axios from "axios";
import "./UploadPDF.css";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import { useInterview } from "../context/InterviewContext";
import { toast } from "react-toastify"; // Correct import for toast notifications
import "react-toastify/dist/ReactToastify.css"; // Import toast styles

const UploadPDF = () => {
  const { setText } = useInterview();
  const [file, setFile] = useState(null);
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.warning("Please select a PDF file.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/pdf/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-auth-token": token,
          },
        }
      );

      localStorage.setItem("text", response.data.text);
      setText(response.data.text);
      toast.success("Resume uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload PDF. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="upload-container">
        <h2>Upload Your Resume (PDF)</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="file-input"
          />
          <button type="submit" disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload Resume"}
          </button>
        </form>
      </div>
    </>
  );
};

export default UploadPDF;
