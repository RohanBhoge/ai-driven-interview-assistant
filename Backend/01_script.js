// import { config } from "dotenv";
// import openAi from "openai";
// config();

// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// async function callOpenAI() {
//   try {
//     const openai = new openAi({ apiKey: process.env.OPENAI_API_KEY });

//     // Your OpenAI API call here
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You are a helpful assistant." },
//         {
//           role: "user",
//           content: "Write a haiku about recursion in programming.",
//         },
//       ],
//     });
//   } catch (error) {
//     if (error.code === "insufficient_quota") {
//       console.log("Quota exceeded. Retrying in 60 seconds...");
//       await delay(60000); // Wait 60 seconds before retrying
//       callOpenAI(); // Retry the request
//     } else {
//       console.error("An error occurred:", error);
//     }
//   }
// }

// callOpenAI();

// // console.log(completion.choices[0].message);

import dotenv from "dotenv";
import express from "express";
import axios from "axios"; // Assuming you're using axios for HTTP requests

const app = express();
const apiKey = process.env.OPENAI_API_KEY; // Replace with your actual API key

app.get("/api/data", async (req, res) => {
  try {
    const response = await axios.get("https://api.example.com/data", {
      headers: {
        // Add API key to headers if applicable
        Authorization: `Bearer ${apiKey}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
