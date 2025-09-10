import HeroSection from "../../components/HeroSection/HeroSection";
import Navbar from "../../components/NavBar/Navbar";
import "./Home.css";
import RightSideContent from "../../components/RightSideContent/RightSideContent";

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
