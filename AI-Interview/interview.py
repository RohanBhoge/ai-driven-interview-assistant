import os
import sys
import contextlib
import json
import time
import tempfile
from dotenv import load_dotenv
import speech_recognition as sr
from gtts import gTTS
import google.generativeai as genai
import signal


def handle_interrupt(signum, frame):
    print(json.dumps({"status": "Interview stopped by user", "complete": True}))
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_interrupt)

# Suppress pygame output
with contextlib.redirect_stdout(None):
    os.environ["PYGAME_HIDE_SUPPORT_PROMPT"] = "1"
    import pygame

    pygame.mixer.init()

# Load API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize audio system
recognizer = sr.Recognizer()

# Global variable to track asked questions
asked_questions = set()


def speak(text):
    """Convert text to speech with proper audio queuing"""
    if not text.strip():
        return
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
            tts = gTTS(text=text, lang="en")
            tts.save(fp.name)
            temp_path = fp.name

        while pygame.mixer.get_busy():
            time.sleep(0.1)

        sound = pygame.mixer.Sound(temp_path)
        channel = sound.play()

        while channel.get_busy():
            time.sleep(0.1)

        os.remove(temp_path)
    except Exception as e:
        print(json.dumps({"error": f"Audio error: {e}"}), file=sys.stderr)


def listen():
    """Listen to user's voice input and convert it to text"""
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        recognizer.pause_threshold = 2.0
        recognizer.energy_threshold = 4000
        recognizer.dynamic_energy_threshold = True

        try:
            print(json.dumps({"status": "Listening for answer..."}))
            sys.stdout.flush()
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=None)
            print(json.dumps({"status": "Processing answer..."}))
            sys.stdout.flush()
            text = recognizer.recognize_google(audio)
            print(json.dumps({"answer": text}))
            sys.stdout.flush()
            return text
        except sr.WaitTimeoutError:
            print(json.dumps({"error": "No response received", "status": "Timeout"}))
            sys.stdout.flush()
            return ""
        except sr.UnknownValueError:
            print(
                json.dumps({"error": "Could not understand audio", "status": "Failed"})
            )
            sys.stdout.flush()
            return ""
        except Exception as e:
            print(
                json.dumps(
                    {"error": f"Voice recognition error: {e}", "status": "Error"}
                )
            )
            sys.stdout.flush()
            return ""


def ask_question(resume_text, difficulty="medium"):
    """Generate a question based on resume and difficulty"""
    global asked_questions
    model = genai.GenerativeModel("gemini-2.5-flash")  # Updated model
    prompt = f"""
    Act as an interviewer. Ask one {difficulty}-level technical question based on this resume:
    {resume_text}
    Return ONLY the question (no extra text).
    """
    max_attempts = 5
    attempt = 0
    while attempt < max_attempts:
        try:
            print(json.dumps({"status": "Generating question..."}))
            sys.stdout.flush()
            response = model.generate_content(prompt)
            question = response.text.strip()
            if question not in asked_questions:
                asked_questions.add(question)
                print(json.dumps({"question": question, "difficulty": difficulty}))
                sys.stdout.flush()
                return question
            else:
                attempt += 1
                if attempt < max_attempts:
                    prompt = f"""
                    The question "{question}" was already asked.
                    Generate a different {difficulty}-level technical question based on this resume:
                    {resume_text}
                    Return ONLY the question (no extra text).
                    """
        except Exception as e:
            print(
                json.dumps(
                    {"error": f"Error generating question: {e}", "status": "Error"}
                )
            )
            sys.stdout.flush()
            return None
    print(
        json.dumps({"error": "Could not generate unique question", "status": "Error"})
    )
    sys.stdout.flush()
    return None


def analyze_answer(question, answer):
    """Analyze the candidate's answer and provide feedback"""
    model = genai.GenerativeModel("gemini-1.5-flash")  # Updated model
    prompt = f"""
    You are an AI interviewer analyzing a candidate's answer.
    Evaluate based on:
    1. Accuracy: Is the answer correct and relevant?
    2. Depth: Does it show good understanding?
    3. Clarity: Is it clear and well-structured?

    Provide feedback in one sentence and difficulty adjustment:
    "Feedback: <your feedback>. Next: <HARDER/SAME/EASIER>"

    Question: {question}
    Answer: {answer}
    """
    try:
        print(json.dumps({"status": "Analyzing answer..."}))
        sys.stdout.flush()
        response = model.generate_content(prompt)
        feedback = response.text.strip()
        if "Next: HARDER" in feedback:
            next_difficulty = "hard"
        elif "Next: EASIER" in feedback:
            next_difficulty = "easy"
        else:
            next_difficulty = "medium"
        print(json.dumps({"feedback": feedback, "nextDifficulty": next_difficulty}))
        sys.stdout.flush()
        return feedback, next_difficulty
    except Exception as e:
        print(json.dumps({"error": f"Error analyzing answer: {e}", "status": "Error"}))
        sys.stdout.flush()
        return "Error analyzing your answer. Please try again.", "medium"


def generate_final_feedback(questions_and_answers):
    """Generate comprehensive feedback based on all questions and answers"""
    model = genai.GenerativeModel("gemini-1.5-flash")  # Updated model
    conversation_history = "\n".join(
        [f"Q: {qa['question']}\nA: {qa['answer']}\n" for qa in questions_and_answers]
    )
    prompt = f"""
    You are an experienced technical interviewer analyzing a complete interview session.
    Based on the following questions and answers, provide comprehensive feedback with these keys:
    - "strengths": List 2-3 areas where the candidate performed well (as a single string with line breaks)
    - "weaknesses": List 2-3 areas that need improvement (as a single string with line breaks)
    - "suggestions": Provide 2-3 actionable suggestions (as a single string with line breaks)
    
    Return ONLY valid JSON with string values in this exact format:
    {{
        "strengths": "1. Strength one\\n2. Strength two",
        "weaknesses": "1. Weakness one\\n2. Weakness two",
        "suggestions": "1. Suggestion one\\n2. Suggestion two"
    }}
    
    Interview Transcript:
    {conversation_history}
    """
    try:
        response = model.generate_content(prompt)
        feedback_text = response.text.strip()
        if feedback_text.startswith("```json"):
            feedback_text = feedback_text[7:-3].strip()
        elif feedback_text.startswith("```"):
            feedback_text = feedback_text[3:-3].strip()
        feedback = json.loads(feedback_text)
        for key in ["strengths", "weaknesses", "suggestions"]:
            if isinstance(feedback[key], list):
                feedback[key] = "\n".join(feedback[key])
            elif not isinstance(feedback[key], str):
                feedback[key] = str(feedback[key])
        return json.dumps(feedback)
    except Exception as e:
        fallback_feedback = {
            "error": f"Error generating final feedback: {e}",
            "fallback": {
                "strengths": "1. Candidate attempted to answer questions",
                "weaknesses": "1. Technical depth needs improvement",
                "suggestions": "1. Review core concepts\n2. Practice explaining technical topics",
            },
        }
        print(json.dumps(fallback_feedback))
        sys.stdout.flush()
        return None


def main():
    try:
        # MODE 1: Final Feedback Generation
        if len(sys.argv) > 2 and sys.argv[1] == "--final-feedback":
            try:
                qa_pairs = json.loads(sys.argv[2])
                feedback = generate_final_feedback(qa_pairs)
                if feedback:
                    print(feedback)
                sys.exit(0)
            except Exception as e:
                print(
                    json.dumps({"error": f"Failed to process final feedback: {str(e)}"})
                )
                sys.exit(1)

        # MODE 2: Standard Interview Flow
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Resume text argument is required."}))
            sys.exit(1)

        resume_text = sys.argv[1]
        print(json.dumps({"status": "Starting interview process"}))
        sys.stdout.flush()

        difficulty = "medium"
        questions_to_ask = 5
        for i in range(questions_to_ask):
            print(
                json.dumps(
                    {
                        "progress": f"Question {i+1}/{questions_to_ask}",
                        "questionNumber": i + 1,
                    }
                )
            )
            sys.stdout.flush()

            question = ask_question(resume_text, difficulty)
            if not question:
                continue

            speak(question)
            time.sleep(1)

            answer = listen()
            if not answer:
                answer = "No answer provided"

            print(json.dumps({"answer": answer}))  # To confirm answer was captured
            sys.stdout.flush()

            feedback, next_difficulty = analyze_answer(question, answer)
            # The analyze_answer function already prints its own JSON, no need to print again here.
            difficulty = next_difficulty

        print(json.dumps({"status": "Interview completed", "complete": True}))
        sys.stdout.flush()
        sys.exit(0)
    except KeyboardInterrupt:
        print(json.dumps({"status": "Interview stopped", "complete": True}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e), "complete": True}))
        sys.exit(1)


if __name__ == "__main__":
    main()
