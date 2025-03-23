import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css"; // Import the CSS file
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const { login } = useAuth(); // Use the login function from the context
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send a POST request to the backend
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
        {
          email: formData.email,
          password: formData.password,
        }
      );

      // Handle successful login
      console.log("Login successful:", response.data.userId);
      login(response.data.token, response.data.userId); // Store the token and userId
      navigate("/uploadpdf"); // Redirect to the upload page
    } catch (error) {
      // Handle errors
      setError(error.response?.data?.message || "Login failed");
      console.error("Login error:", error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="signup-page-wrapper">
        <div className="login-container">
          <h1>Welcome Back</h1>
          {error && <p className="error-message">{error}</p>}
          <form className="login-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
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
      </div>
    </>
  );
};

export default Login;
