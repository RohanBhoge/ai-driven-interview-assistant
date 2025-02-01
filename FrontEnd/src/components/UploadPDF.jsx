import { useState } from "react";
import axios from "axios";
import "./UploadPDF.css"; // Ensure you have this CSS file
import { useAuth } from "../context/AuthContext";

const UploadPDF = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const { token } = useAuth();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/pdf/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-auth-token": token, // Include the JWT token
          },
        }
      );
      setText(response.data.text);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload and extract text.");
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload PDF to Extract Text</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <button type="submit">Upload and Extract Text</button>
      </form>
      {text && (
        <div className="text-output">
          <h3>Extracted Text:</h3>
          <pre>{text}</pre>
        </div>
      )}
    </div>
  );
};

export default UploadPDF;