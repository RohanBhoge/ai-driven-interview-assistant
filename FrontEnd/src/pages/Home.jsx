import LeftSideContent from "../components/LeftSideContent";
import Nav from "../components/Navbar";
import RightSideContent from "../components/RightSideContent";
import "./Home.css";

const Home = () => {
  return (
    <>
      <Nav />
      <div className="main">
        <LeftSideContent />
        <RightSideContent />
      </div>
    </>
  );
};
  
export default Home;
