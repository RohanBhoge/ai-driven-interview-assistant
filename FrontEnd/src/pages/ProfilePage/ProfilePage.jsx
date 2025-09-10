import Navbar from "../../components/NavBar/Navbar";
import ProfileSection from "../../components/ProfileSection/ProfileSection";
import "./ProfilePage.css";

const ProfilePage = () => {
  return (
    <div className="profile-page">
      <Navbar />
      <ProfileSection />
    </div>
  );
};

export default ProfilePage;
