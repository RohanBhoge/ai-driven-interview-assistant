// Home.js
import React from "react";
import "./Home.css";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div>
      <h1>AI Interview Assistance</h1>
      <p>Ace your interviews with AI-powered assistance</p>
      <Link to="/login">Login</Link> or <Link to="/signup">Signup</Link>
    </div>
  );
}

export default Home;
