import { Link } from "react-router-dom";
import "./HeroSection.css";

const HeroSection = () => {
  return (
    <div className="hero-section">
      <h1>AI Interviewer to Help You Land Your Dream Job</h1>
      <p>Practice AI Interviews for FREE!</p>
      <Link to="/interview" className="text-white hover:text-gray-300">
        <button>Start AI Interview</button>
      </Link>
    </div>
  );
};

export default HeroSection;
