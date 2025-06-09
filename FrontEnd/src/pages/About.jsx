import Navbar from "../components/Navbar";
import "./About.css";

const About = () => {
  return (
    <>
      <Navbar />
      <div className="about-container">
        <h1 className="about-title">
          About AI Driven Mock Interview Assistance
        </h1>
        <p className="about-description">
          The AI Interview Tool is designed to help candidates practice
          real-world interview scenarios using AI-driven technology. By
          analyzing resumes and generating tailored questions, this tool ensures
          a personalized and effective preparation experience.
        </p>

        <h2 className="about-subtitle">Why Choose Our AI Interview Tool?</h2>
        <ul className="about-list">
          <li>✅ Real-time AI interviewer for an interactive experience</li>
          <li>✅ Dynamic question difficulty adapts based on your answers</li>
          <li>✅ Speech and video recording for self-analysis</li>
          <li>✅ Comprehensive feedback to improve your responses</li>
          <li>✅ Secure resume upload for skill-based question generation</li>
        </ul>
      </div>
    </>
  );
};

export default About;
