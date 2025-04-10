import HeroSection from "../components/HeroSection";
import Navbar from "../components/Navbar";
import "./Home.css";
import RightSideContent from "../components/RightSideContent";

const Home = () => {
  return (
    <>
      <Navbar />
      <div className="home">
        <HeroSection />
        <RightSideContent />
      </div>
    </>
  );
};

export default Home;
