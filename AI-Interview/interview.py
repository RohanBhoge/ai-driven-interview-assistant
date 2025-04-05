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
    recognizer = sr.Recognizer()

    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        recognizer.pause_threshold = 1.5
        recognizer.energy_threshold = 4000

        try:
            # Send status update to frontend
            print(json.dumps({"status": "Listening for answer..."}))
            sys.stdout.flush()  # Force flush to ensure message is sent immediately

            audio = recognizer.listen(
                source, timeout=5, phrase_time_limit=10
            )  # Set time limits

            # Send processing status to frontend
            print(json.dumps({"status": "Processing answer..."}))
            sys.stdout.flush()

            text = recognizer.recognize_google(audio)
            # Send the recognized text to frontend
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
        # Notify that we're generating a question
        print(json.dumps({"status": "Generating question..."}))
        sys.stdout.flush()

        response = model.generate_content(prompt)
        question = response.text.strip()

        # Send the generated question immediately
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
    You are an AI interviewer analyzing a candidate's answer to a question.  
    Evaluate the answer based on the following criteria:  
    1. Accuracy: Is the answer correct and relevant to the question?  
    2. Depth: Does the answer demonstrate a good understanding of the topic?  
    3. Clarity: Is the answer clear and well-structured?  

    Based on the evaluation, provide feedback in one sentence and decide the difficulty level for the next question:  
    - If the answer is excellent, say 'HARDER'.  
    - If the answer is average, say 'SAME'.  
    - If the answer is poor, say 'EASIER'.  

    Question: {question}  
    Answer: {answer}  

    Provide feedback and the difficulty adjustment in this format:  
    "Feedback: <your feedback>. Next: <HARDER/SAME/EASIER>"  
    """
    try:
        # Notify that we're analyzing the answer
        print(json.dumps({"status": "Analyzing answer..."}))
        sys.stdout.flush()

        response = model.generate_content(prompt)
        feedback = response.text.strip()

        # Extract the difficulty adjustment from the feedback
        if "Next: HARDER" in feedback:
            next_difficulty = "hard"
        elif "Next: EASIER" in feedback:
            next_difficulty = "easy"
        else:
            next_difficulty = "medium"

        # Send feedback immediately
        print(json.dumps({"feedback": feedback, "nextDifficulty": next_difficulty}))
        sys.stdout.flush()

        return feedback, next_difficulty
    except Exception as e:
        print(json.dumps({"error": f"Error analyzing answer: {e}", "status": "Error"}))
        sys.stdout.flush()
        return "Error analyzing your answer. Please try again.", "medium"


def main():
    print(json.dumps({"status": "Starting interview process"}))
    sys.stdout.flush()

    if len(sys.argv) < 2:
        print(json.dumps({"error": "Resume text is required"}))
        sys.stdout.flush()
        sys.exit(1)

    resume_text = sys.argv[1]
    difficulty = "medium"
    interview_data = {"questions": [], "answers": [], "feedback": []}

    for i in range(5):  # Ask 5 questions for testing
        # Send interview progress info
        print(json.dumps({"progress": f"Question {i+1}/5", "questionNumber": i + 1}))
        sys.stdout.flush()

        question = ask_question(resume_text, difficulty)
        if not question:
            continue

        # Add to interview data
        interview_data["questions"].append(question)

        # Speak the question
        speak(question)
        time.sleep(1)

        # Listen for answer
        answer = listen()

        if answer:
            interview_data["answers"].append(answer)
            feedback, next_difficulty = analyze_answer(question, answer)
            interview_data["feedback"].append(feedback)

            # Speak the feedback
            speak(feedback)
            time.sleep(1)

            difficulty = next_difficulty
        else:
            interview_data["answers"].append("No answer provided")
            interview_data["feedback"].append(
                "No feedback available due to missing answer"
            )

    # Send interview completion notification
    print(json.dumps({"status": "Interview completed", "complete": True}))
    sys.stdout.flush()

    sys.exit(0)


if __name__ == "__main__":
    main()
