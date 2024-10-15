import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
config();

// Make sure to include these imports:
// import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt =
  "generate quation on css to ask candidate, (generate only one quation)";

const result = await model.generateContent(prompt);
console.log(result.response.text());