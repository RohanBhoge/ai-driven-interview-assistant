import FeatureCard from "../../components/FeatureCard/FeatureCard";
import Navbar from "../../components/NavBar/Navbar.jsx";
import "./Feature.css";

const Features = () => {
  const featuresData = [
    {
      title: "📄 Resume Analysis",
      description:
        "AI extracts key skills and generates relevant interview questions.",
    },
    {
      title: "🎤 Voice & Video Recording",
      description: "Record your responses for self-evaluation.",
    },
    {
      title: "💡 AI-Generated Questions",
      description: "Get customized questions based on job roles.",
    },
    {
      title: "📊 Answer Analysis",
      description: "Get insights and feedback to improve your responses.",
    },
    {
      title: "🎯 Dynamic Difficulty Level",
      description:
        "Questions become harder or easier based on your performance.",
    },
    {
      title: "🔐 Secure Data Handling",
      description:
        "Your resume and recordings are safely stored and processed.",
    },
  ];

  return (
    <>
      <Navbar />
      <div className="features-container">
        <h1 className="features-title">Features of AI Interview Tool</h1>
        <div className="features-list">
          {featuresData.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Features;
