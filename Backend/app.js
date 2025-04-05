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
// In your CORS configuration (app.js)
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-auth-token"],
  })
);

// Add this before your routes
app.use((req, res, next) => {
  res.header("Access-Control-Expose-Headers", "x-auth-token");
  next();
});

// Database connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/user", userRoutes);
app.use("/api/interview", interviewRoutes);

// Instead of app.listen, export the app
module.exports = app;
