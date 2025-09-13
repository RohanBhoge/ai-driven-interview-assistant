import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../NavBar/Navbar";
import "./Auth.css";
import AuthForm from "./AuthForm";
import SwitchMode from "./SwitchMode";
import ErrorMessage from "./ErrorMessage";

const Auth = () => {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  const switchModeHandler = () => {
    setIsLoginMode((prevMode) => !prevMode);
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    setError(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isLoginMode) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/register`,
          {
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }
        );
        console.log("Registration successful:", response.data);
        navigate("/");
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Registration failed. Please try again."
        );
      }
    } else {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
          {
            email: formData.email,
            password: formData.password,
          }
        );
        console.log("Login successful:", response.data);
        navigate("/dashboard");
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Login failed. Please check your credentials."
        );
      }
    }

    setIsLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="auth-page-wrapper">
        <div className="auth-container">
          <h1>{isLoginMode ? "Welcome Back!" : "Create Your Account"}</h1>
          <ErrorMessage message={error} />
          <AuthForm
            isLoginMode={isLoginMode}
            isLoading={isLoading}
            formData={formData}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
          />
          <SwitchMode isLoginMode={isLoginMode} switchModeHandler={switchModeHandler} />
        </div>
      </div>
    </>
  );
};

export default Auth;
