import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <div className="navbar flex gap-12 justify-between items-center m-7">
      <div className="log">
        <Link to={"/"} className="logo">Ai-Driven Interview Assistance</Link>
        <Link className="navbar-link" to={"/features"}>
          Features
        </Link>
        <Link className="navbar-link" to={"/about"}>
          About
        </Link>
      </div>
      <div className="navigation flex gap-4">
        <Link className="login" to={"/login"}>
          Login
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
