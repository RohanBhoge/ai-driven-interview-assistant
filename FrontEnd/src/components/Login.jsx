import { Link } from "react-router-dom";
import "./Login.css"; // Import the CSS file

const Login = () => {
  return (
    <div className="login-container">
      <h1>Welcome Back</h1>
      <form className="login-form">
        <div>
          <label htmlFor="email">Email</label>
          <input type="email" id="email" placeholder="Enter your email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" className="login-button">
          Login
        </button>
      </form>
      <div className="login-links">
        <a href="#">Forgot Password?</a>
        <Link to={"/signup"}>Sign Up</Link>
      </div>
    </div>
  );
};

export default Login;
