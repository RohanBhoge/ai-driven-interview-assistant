import { useNavigate } from "react-router-dom";
import "./LeftSideContent.css";
const LeftSideContent = () => {
  const navigation = useNavigate();
  return (
    <div className="left-side-content">
      <div className="heading">
        <span className="heading-span"> Conquer Interview Anxiety</span> With
        our AI Interview Tool
      </div>
      <div className="sub-heading">
        Get the job you deserve with our AI-driven interview assistance tool
      </div>
      <div className="start-button">
        <button onClick={() => navigation("/uploadpdf")}>
          Start Interview
        </button>
        <img src="" alt="next arrow" />
      </div>
    </div>
  );
};

export default LeftSideContent;