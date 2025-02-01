import "./Feature.css";
import Navbar from "../components/Navbar";
const Features = () => {
  return (
    <div className="features">
      <Navbar />
      <div className="features-content">
        <h1>Features</h1>
        <p>
          Explore our features designed to help you practice and improve your
          interview skills with AI-driven assistance.
        </p>
      </div>
    </div>
  );
};

export default Features;
