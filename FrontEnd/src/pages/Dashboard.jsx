// Dashboard.js
import React from "react";
import { Link } from "react-router-dom";
import "./Dashboard.jsx";

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <nav>
        <ul>
          <li>
            <Link to="/upload-resume">Upload Resume</Link>
          </li>
          <li>
            <Link to="/view-questions">View Questions</Link>
          </li>
          <li>
            <Link to="/logout">Logout</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Dashboard;
