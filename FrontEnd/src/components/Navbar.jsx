import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import profileIcon from "../assets/profile.png";
const Navbar = () => {
  const { token, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="navbar flex gap-12 justify-between items-center m-7">
      <div className="log">
        <Link to={"/"} className="logo">
          AI-Driven Mock Interview Assitance
        </Link>

        <Link className="navbar-link" to={"/features"}>
          Features
        </Link>
        <Link className="navbar-link" to={"/about"}>
          About
        </Link>
      </div>
      <div className="navigation flex gap-4">
        {token ? (
          <div
            className="profile-icon"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <img
              src={profileIcon} // Replace with your user icon
              alt="Profile"
              className="profile-image"
            />
            {showDropdown && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => navigate("/profile")}
                >
                  Account
                </div>
                <div className="dropdown-item" onClick={handleLogout}>
                  Sign Out
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link className="login" to={"/login"}>
            Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;
