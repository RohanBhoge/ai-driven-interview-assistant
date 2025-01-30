import { Link } from "react-router-dom";
import "./Navbar.css";

const Nav = () => {
  return (
    <div className="navbar flex gap-12 justify-between items-center m-7">
      <div className="log">Ai-Driven Interview Assistance</div>
      <Link className="login" to={"/login"}>Login</Link>
    </div>
  );
};

export default Nav;