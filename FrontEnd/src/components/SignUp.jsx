import { Link } from "react-router-dom";
import "./SignUp.css"; // Import the CSS file

const SignUp = () => {
  return (
    <div className="signup-container">
      <h1>Create Your Account</h1>
      <form className="signup-form">
        <div>
          <label htmlFor="name">Name</label>
          <input type="text" id="name" placeholder="Enter your name" />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input type="email" id="email" placeholder="Enter your email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Create a password"
          />
        </div>
        <div>
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            placeholder="Confirm your password"
          />
        </div>
        <button type="submit" className="signup-button">
          Sign Up
        </button>
      </form>
      <div className="signup-links">
        <p>
          Already have an account? <Link to={"/login"}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
