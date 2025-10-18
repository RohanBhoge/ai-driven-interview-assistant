const dotenv = require("dotenv");
dotenv.config();
const app = require("./app"); // Import your Express app

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
