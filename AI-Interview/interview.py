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

# Suppress pygame output
with contextlib.redirect_stdout(None):
    os.environ["PYGAME_HIDE_SUPPORT_PROMPT"] = "1"
    import pygame

    pygame.mixer.init()  # Initialize pygame without printing version info

# Load API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize audio system once
recognizer = sr.Recognizer()


def speak(text):
    """Convert text to speech with proper audio queuing"""
    if not text.strip():
        return

    try:
        # Create temporary audio file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fp:
            tts = gTTS(text=text, lang="en")
            tts.save(fp.name)
            temp_path = fp.name

        # Wait for previous audio to finish
        while pygame.mixer.get_busy():
            time.sleep(0.1)

        # Load and play audio
        sound = pygame.mixer.Sound(temp_path)
        channel = sound.play()

        # Wait for audio to finish
        while channel.get_busy():
            time.sleep(0.1)

        # Clean up
        os.remove(temp_path)

    except Exception as e:
        print(json.dumps({"error": f"Audio error: {e}"}), file=sys.stderr)


def listen():
    """Listen to user's voice input and convert it to text"""
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        recognizer.pause_threshold = 1.5
        recognizer.energy_threshold = 4000

        try:
            print(json.dumps({"status": "Listening for answer..."}))
            sys.stdout.flush()

            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
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
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""  
    Act as an interviewer. Ask one {difficulty}-level technical question based on this resume:  
    {resume_text}  
    Return ONLY the question (no extra text).  
    """
    try:
        print(json.dumps({"status": "Generating question..."}))
        sys.stdout.flush()

        response = model.generate_content(prompt)
        question = response.text.strip()

        print(json.dumps({"question": question, "difficulty": difficulty}))
        sys.stdout.flush()
        return question
    except Exception as e:
        print(
            json.dumps({"error": f"Error generating question: {e}", "status": "Error"})
        )
        sys.stdout.flush()
        return None


def analyze_answer(question, answer):
    """Analyze the candidate's answer and provide feedback"""
    model = genai.GenerativeModel("gemini-2.0-flash")
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
    model = genai.GenerativeModel("gemini-2.0-flash")

    conversation_history = "\n".join(
        [f"Q: {qa['question']}\nA: {qa['answer']}\n" for qa in questions_and_answers]
    )

    prompt = f"""
    You are an experienced technical interviewer analyzing a complete interview session.
    Based on the following questions and answers, provide comprehensive feedback with these keys:
    - "strengths": List 2-3 areas where the candidate performed well (as a single string with line breaks)
    - "weaknesses": List 2-3 areas that need improvement (as a single string with line breaks)
    - "suggestions": Provide 2-3 actionable suggestions (as a single string with line breaks)
    
    Return ONLY valid JSON with string values (not arrays) in this exact format:
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

        # Clean the response
        if feedback_text.startswith("```json"):
            feedback_text = feedback_text[7:-3].strip()
        elif feedback_text.startswith("```"):
            feedback_text = feedback_text[3:-3].strip()

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

    for i in range(1):  # Ask 5 questions
        print(json.dumps({"progress": f"Question {i+1}/5", "questionNumber": i + 1}))
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
    main()
