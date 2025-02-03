import Navbar from "../components/Navbar";
import ProfileSection from "../components/ProfileSection";
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
