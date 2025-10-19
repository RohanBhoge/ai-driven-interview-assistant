import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Suppress pygame output
with contextlib.redirect_stdout(None):
    os.environ["PYGAME_HIDE_SUPPORT_PROMPT"] = "1"
    import pygame

    pygame.mixer.init()  # Initialize pygame without printing version info

# Load API key
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment")

genai.configure(api_key=API_KEY)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


def _strip_code_fences(text: str) -> str:
    """Remove ```json or ``` fences if present and trim whitespace."""
    if not text:
        return text
    text = text.strip()
    # remove leading/trailing ```json or ```
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


@app.route("/generate-question", methods=["POST"])
def generate_question():
    """
        Request JSON:
        {
          "resumeText": "Rohan Bhoge
     Pune,India |
    +919028961783 |
    er.bhogerohan60@gmail.com |
    linkedin.com/in/rohanbhoge |
    github.com/RohanBhoge
     Education
     Bachelor of Engineering
     Artificial Intelligence and Data Science
     D. Y. Patil College of Engineering, Pune.
     HSC | 79.00 %
     Shri Shanishwar Junior College, Sonai.
     SSC | 75.80 %
     Dnyaneshwar Vidyalay, Kharwandi
     Skills
     2021-2025
     2020-2021
     2018-2019
     Technical Skills
     • JavaScript, Python, C++
     • HTML, CSS
     • Tailwind CSS
     • ReactJS
     • NodeJS, ExpressJS
     • Django, FastAPI
     • MongoDB, SQL
     • Gen AI
     • RAG
     • Prompt Engineering
     • Object-Oriented Programming
     • Git, GitHub
     • Postman, MongoDB Atlas
     Experience
     Soft Skills
     • Critical Thinking
     • Time Management
     • Adaptable
     • Problem Solver
     Web Development Intern
     During my internship, I developed responsive and interactive web pages using HTML, CSS, and JavaScript, ensuring optimal
     user experience across various devices. I also contributed to project development, applying front-end technologies to build
     functional and user-friendly interfaces. Additionally, I performed unit testing and debugging to maintain cross-browser
     compatibility and ensure consistent website performance.
     Projects
     QuickCart-ECom– A React-Based E-commerce Web Application
     QuickCart is a full-stack e-commerce application designed to provide users with an intuitive shopping experience. Built using
     the MERN stack (MongoDB, Express.js, React.js, and Node.js), this application supports functionalities like browsing products,
     user authentication, cart management, and order placement.
     Key features include User authentication, product browsing with filtering and sorting, cart management with quantity control,
     order placement, and responsive design for all devices using the MERN stack. [Link]
     AI-Driven Interview Assistance– Interview simulator with adaptive question levels
     The AI-Driven Interview AssistanceBuilt an AI-driven mock interview simulator using the MERN stack that enables users to
     upload resumes, receive AI-generated questions based on extracted skills, and interact through real-time audio/video.
     Integrated speech recognition and text-to-speech for dynamic QA, implemented adaptive difficulty logic, and delivered
     performance feedback through a seamless and interactive UI. Key features include Resume-based dynamic question generation
     using Gemini API, real-time video/audio interaction, NLP and ML-powered response analysis, and personalized feedback, built
     with the MERN stack and Python integration [Link]
     VidTube– A React-Based Video Streaming Platform
     The VidTubeThe VidTube app offers a sleek, user-friendly interface for discovering, watching, and enjoying videos. Built with
     React, CSS, and HTML, the platform ensures a smooth, immersive experience with seamless video playback and easy
     navigation. Key features include a dynamic video feed, interactive search functionality, user-friendly video player with controls,
     responsive design, and a highly intuitive interface for an optimal viewing experience on all devices. [Link]",
          "difficulty": "easy|medium|hard",
          "askedQuestions": ["q1", "q2", ...]  // optional
        }
        Response JSON:
        { "question": "...", "difficulty": "<difficulty>" }
    """
    payload = request.get_json(force=True) or {}
    resume_text = payload.get("resumeText", "")
    difficulty = payload.get("difficulty", "medium")
    asked_questions = payload.get("askedQuestions", []) or []

    # Build prompt
    prompt = f"""
You are an expert technical interviewer. Generate ONE {difficulty}-level technical interview question
based on the resume text below. Make the question relevant to the candidate's skills and role.

Resume:
\"\"\"
{resume_text}
\"\"\"

Do NOT return any extra text or commentary — return ONLY the question text.
If the generated question matches any of the following previously asked questions, generate a different one:
{json.dumps(asked_questions)}
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")  # Using 1.5-flash
        response = model.generate_content(prompt)
        question_text = (response.text or "").strip()
        question_text = _strip_code_fences(question_text)

        if not question_text:
            return jsonify({"error": "Failed to generate a question."}), 500

        return jsonify({"question": question_text, "difficulty": difficulty})
    except Exception as e:
        return jsonify({"error": f"Error generating question: {str(e)}"}), 500


@app.route("/analyze-answer", methods=["POST"])
def analyze_answer():
    """
    Request JSON:
    {
      "question": "...",
      "answer": "..."
    }

    Response JSON:
    {
      "feedback": "One-sentence feedback ... Next: HARDER/SAME/EASIER",
      "nextDifficulty": "easy|medium|hard"
    }
    """
    payload = request.get_json(force=True) or {}
    question = payload.get("question", "")
    answer = payload.get("answer", "")

    if not question:
        return jsonify({"error": "question is required"}), 400

    prompt = f"""
You are an AI interviewer analyzing a candidate's answer.
Evaluate based on accuracy, depth, and clarity.

Provide a concise one-sentence feedback and indicate the appropriate next difficulty level
as one of HARDER, SAME, or EASIER.

Return a single JSON object ONLY, for example:
{{ "feedback": "Feedback sentence. Next: HARDER", "nextDifficulty": "HARDER" }}

Question: {question}
Answer: {answer}
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        raw_text = (response.text or "").strip()
        raw_text = _strip_code_fences(raw_text)

        parsed = {}
        try:
            parsed = json.loads(raw_text)
            feedback = parsed.get("feedback", raw_text)
            next_diff_raw = parsed.get("nextDifficulty", "")
        except Exception:
            feedback = raw_text
            if "HARDER" in raw_text.upper():
                next_diff_raw = "HARDER"
            elif "EASIER" in raw_text.upper():
                next_diff_raw = "EASIER"
            else:
                next_diff_raw = "SAME"

        nd = (next_diff_raw or "SAME").upper()
        if nd == "HARDER" or nd == "HARD":
            next_diff = "hard"
        elif nd == "EASIER" or nd == "EASY":
            next_diff = "easy"
        else:
            next_diff = "medium"

        return jsonify({"feedback": feedback, "nextDifficulty": next_diff})
    except Exception as e:
        return jsonify({"error": f"Error analyzing answer: {str(e)}"}), 500


@app.route("/final-feedback", methods=["POST"])
def final_feedback():
    """
    Request JSON:
    {
      "qaPairs": [ { "question": "...", "answer": "..." }, ... ]
    }

    Response JSON:
    {
      "strengths": "...",
      "weaknesses": "...",
      "suggestions": "..."
    }
    """
    payload = request.get_json(force=True) or {}
    qa_pairs = payload.get("qaPairs", [])

    if not isinstance(qa_pairs, list) or not qa_pairs:
        return jsonify({"error": "qaPairs (non-empty list) is required"}), 400

    conversation_history = "\n".join(
        [f"Q: {qa.get('question','')}\nA: {qa.get('answer','')}" for qa in qa_pairs]
    )

    prompt = f"""
You are an experienced technical interviewer analyzing a complete interview session.
Based on the following transcript, return ONLY a single JSON object with these keys:
- strengths: string (2-3 items separated by newlines)
- weaknesses: string (2-3 items separated by newlines)
- suggestions: string (2-3 actionable items separated by newlines)

Return valid JSON only.

Transcript:
{conversation_history}
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        raw_text = (response.text or "").strip()
        raw_text = _strip_code_fences(raw_text)

        # Parse to validate JSON
        feedback = json.loads(feedback_text)

        # Ensure all values are strings
        for key in ["strengths", "weaknesses", "suggestions"]:
            if isinstance(feedback[key], list):
                feedback[key] = "\n".join(feedback[key])
            elif not isinstance(feedback[key], str):
                feedback[key] = str(feedback[key])

        return json.dumps(feedback)
    except Exception as e:
        print(
            json.dumps(
                {
                    "error": f"Error generating final feedback: {e}",
                    "fallback": {
                        "strengths": "1. Candidate attempted to answer questions",
                        "weaknesses": "1. Technical depth needs improvement",
                        "suggestions": "1. Review core concepts\n2. Practice explaining technical topics",
                    },
                }
            )
        )
        sys.stdout.flush()
        return None


def main():
    # Check if we're in final feedback mode
    if len(sys.argv) > 2 and sys.argv[1] == "--final-feedback":
        try:
            qa_pairs = json.loads(sys.argv[2])
            feedback = generate_final_feedback(qa_pairs)
            if feedback:
                print(feedback)
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

    # Original interview flow
    print(json.dumps({"status": "Starting interview process"}))
    sys.stdout.flush()

    if len(sys.argv) < 2:
        print(json.dumps({"error": "Resume text is required"}))
        sys.stdout.flush()
        sys.exit(1)

    resume_text = sys.argv[1]
    difficulty = "medium"
    quations = 5  # Number of questions to ask
    for i in range(quations):  # Ask 5 questions
        print(
            json.dumps(
                {"progress": f"Question {i+1}/{quations}", "questionNumber": i + 1}
            )
        )
        sys.stdout.flush()

        question = ask_question(resume_text, difficulty)
        if not question:
            continue

        print(json.dumps({"question": question, "difficulty": difficulty}))
        sys.stdout.flush()

        speak(question)
        time.sleep(1)

        answer = listen()
        if not answer:
            answer = "No answer provided"

        print(json.dumps({"answer": answer}))
        sys.stdout.flush()

        feedback, next_difficulty = analyze_answer(question, answer)
        print(json.dumps({"feedback": feedback}))
        sys.stdout.flush()

        difficulty = next_difficulty

    print(json.dumps({"status": "Interview completed", "complete": True}))
    sys.stdout.flush()
    sys.exit(0)


if __name__ == "__main__":
    # Get port from environment or default to 5000
    port = int(os.getenv("PYTHON_AI_PORT", 5000))
    print(f"Starting Python AI server on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
