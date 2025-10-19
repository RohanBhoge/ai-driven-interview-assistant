const app = require("./app"); // Import your Express app
const dotenv = require("dotenv");
const { startInterview } = require("./controllers/interviewController");

dotenv.config();

const PORT = process.env.PORT || 5000;

app.get("/api/interview/start-interview", startInterview);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
