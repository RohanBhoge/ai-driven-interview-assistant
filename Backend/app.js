const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const authRoutes = require("./routes/authRoutes.js");
const pdfRoutes = require("./routes/pdfRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const interviewRoutes = require("./routes/interviewRoutes.js");

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
    credentials: true,
  })
);

// Database connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/user", userRoutes);
app.use("/api/interview", interviewRoutes);

// Instead of app.listen, export the app
module.exports = app;
