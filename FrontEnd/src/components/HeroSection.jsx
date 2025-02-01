import { Link } from "react-router-dom";
import "./HeroSection.css";

const HeroSection = () => {
  return (
    <div className="hero-section">
      <h1>All Interviewer to help you get your dream job</h1>
      <p>Practice 2 All Interviews for FREE!</p>
      <Link to="/start" className="start-button">
        Start
      </Link>
    </div>
  );
};

export default HeroSection;