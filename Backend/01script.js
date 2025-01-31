import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
config();

// Make sure to include these imports:
// import { GoogleGenerativeAI } from "@google/generative-ai";

// Make sure to include these imports:
// import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = "Write a story about a magic backpack.";

const result = await model.generateContent(prompt);
console.log(result.response.text());

// const genAI = new GoogleGenerativeAI(process.env.API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// const prompt =
//   "generate quation on css to ask candidate, (generate only one quation)";

// const result = await model.generateContent(prompt);
// console.log(result.text());

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { config } from "dotenv";
// // Import the prompt-sync library using ES module syntax
// import promptSync from "prompt-sync";

// // Initialize the prompt function
// const prompt = promptSync();
// config(); // Load environment variables from .env file

// // Initialize the Google Generative AI model with your API key
// const genAI = new GoogleGenerativeAI(process.env.API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// // List of predefined questions based on difficulty levels

// // const prompt = require("prompt-sync")();

// // const name = prompt("What is your name? ");
// // console.log(`Hello, ${name}!`);

// const questions = {
//   easy: [
//     "What is a variable in JavaScript, and how do you declare one?",
//     "Explain the difference between `let`, `const`, and `var` in JavaScript.",
//     "What are JavaScript data types?",
//     "How do you write a `for` loop in JavaScript?",
//     "What is the purpose of the `console.log()` function in JavaScript?",
//   ],
//   medium: [
//     "What is the difference between `==` and `===` in JavaScript?",
//     "Explain what closures are in JavaScript.",
//     "What is a callback function, and how do you use it?",
//     "What are promises in JavaScript, and how do they work?",
//     "What is the purpose of the `this` keyword in JavaScript?",
//   ],
//   hard: [
//     "What is the event loop in JavaScript, and how does it work?",
//     "Explain the concept of hoisting in JavaScript.",
//     "What is the difference between synchronous and asynchronous code in JavaScript?",
//     "How does prototypal inheritance work in JavaScript?",
//     "Explain how `async/await` works in JavaScript and how it differs from promises.",
//   ],
// };

// // Function to select a question based on difficulty
// function getQuestion(difficulty, questionIndex) {
//   return questions[difficulty][questionIndex];
// }

// // Function to evaluate the candidate's answer
// function evaluateAnswer(answer, correctAnswer) {
//   return answer.toLowerCase() === correctAnswer.toLowerCase(); // Basic evaluation
// }

// // Function to adjust the difficulty based on feedback
// function adjustDifficulty(isCorrect, currentDifficulty) {
//   if (isCorrect) {
//     if (currentDifficulty === "easy") return "medium";
//     if (currentDifficulty === "medium") return "hard";
//   } else {
//     if (currentDifficulty === "hard") return "medium";
//     return "easy";
//   }
//   return currentDifficulty;
// }

// // Main interview loop
// async function startInterview() {
//   let currentDifficulty = "easy"; // Start with easy questions
//   let questionIndex = 0;
//   let questionCount = 0;
//   let continueInterview = true;

//   // Ask initial 5 questions
//   while (continueInterview && questionCount < 10) {
//     const question = getQuestion(currentDifficulty, questionIndex);
//     console.log("Question:", question);

//     // Simulate candidate's answer (replace with actual user input)
//     const answer = prompt("Your answer: "); // In real-world, you'd capture this from input
//     const correctAnswer = "correct"; // Set correct answer for now (for demo purposes)

//     const isCorrect = evaluateAnswer(answer, correctAnswer);

//     if (!isCorrect && currentDifficulty === "easy") {
//       console.log("Incorrect answer. Interview ended.");
//       return;
//     }

//     // Adjust difficulty based on answer
//     currentDifficulty = adjustDifficulty(isCorrect, currentDifficulty);

//     console.log(
//       `Based on your answer, the next question will be ${currentDifficulty}.`
//     );

//     // Update question index and count
//     questionIndex = (questionIndex + 1) % 5; // Cycle through 5 questions
//     questionCount++;

//     // After 10 questions, ask if the candidate wants to continue
//     if (questionCount === 10) {
//       const continueResponse = prompt("Do you want to continue? (yes/no): ");
//       continueInterview = continueResponse.toLowerCase() === "yes";
//     }
//   }

//   // If the candidate continues, generate 5 more questions
//   while (continueInterview) {
//     questionCount = 0; // Reset question count for each new batch of questions

//     while (continueInterview && questionCount < 5) {
//       const question = getQuestion(currentDifficulty, questionIndex);
//       console.log("Question:", question);

//       // Simulate candidate's answer (replace with actual user input)
//       const answer = prompt("Your answer: "); // In real-world, you'd capture this from input
//       const correctAnswer = "correct"; // Set correct answer for now (for demo purposes)

//       const isCorrect = evaluateAnswer(answer, correctAnswer);

//       if (!isCorrect && currentDifficulty === "easy") {
//         console.log("Incorrect answer. Interview ended.");
//         return;
//       }

//       // Adjust difficulty based on answer
//       currentDifficulty = adjustDifficulty(isCorrect, currentDifficulty);

//       console.log(
//         `Based on your answer, the next question will be ${currentDifficulty}.`
//       );

//       // Update question index and count
//       questionIndex = (questionIndex + 1) % 5;
//       questionCount++;
//     }

//     const continueResponse = prompt("Do you want to continue? (yes/no): ");
//     continueInterview = continueResponse.toLowerCase() === "yes";
//   }

//   console.log("Interview ended.");
// }

// startInterview();
