import "./About.css";
import Navbar from "../components/Navbar";
const About = () => {
  return (
    <div className="about">
      <Navbar />
      <div className="about-content">
        <h1>About Us</h1>
        <p>
          Ai-Driven Interview Assistance is dedicated to helping you conquer
          interview anxiety and land your dream job. Our platform offers a wide
          range of AI-driven tools and resources to help you practice and
          improve your interview skills.
        </p>
      </div>
    </div>
  );
};

export default About;