import { useState } from "react";
import axios from "axios";
// import { useNavigate } from "react-router-dom";

const InterviewPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  //   const navigate = useNavigate();

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/interview/start-interview", {
        resumeText: "Your resume text here", // Replace with actual resume text
      });
      setQuestions(response.data.data);
    } catch (error) {
      console.error("Error starting interview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Interview</h1>

      {questions.length === 0 ? (
        <button
          onClick={startInterview}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {isLoading ? "Starting..." : "Start Interview"}
        </button>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">
            Question {currentQuestion + 1}:
          </h2>
          <p className="my-2">{questions[currentQuestion].text}</p>

          <button
            onClick={() => setCurrentQuestion((prev) => prev + 1)}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Next Question
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
