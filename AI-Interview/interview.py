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
            print(json.dumps({"status": "Listening for answer..."}))  # Inform frontend
            sys.stdout.flush()  # Ensure message is sent to frontend

            audio = recognizer.listen(
                source, timeout=5, phrase_time_limit=10
            )  # Set time limits

            print(json.dumps({"status": "Processing answer..."}))
            sys.stdout.flush()

            text = recognizer.recognize_google(audio)
            return text

        except sr.WaitTimeoutError:
            print(json.dumps({"error": "Listening timeout, no response received."}))
            sys.stdout.flush()
            return ""

        except sr.UnknownValueError:
            print(json.dumps({"error": "Could not understand audio."}))
            sys.stdout.flush()
            return ""

        except Exception as e:
            print(
                json.dumps({"error": f"Voice recognition error: {e}"}), file=sys.stderr
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
        response = model.generate_content(prompt)
        question = response.text.strip()
        return question
    except Exception as e:
        print(json.dumps({"error": f"Error generating question: {e}"}), file=sys.stderr)
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
        response = model.generate_content(prompt)
        feedback = response.text.strip()

        # Extract the difficulty adjustment from the feedback
        if "Next: HARDER" in feedback:
            return feedback, "hard"
        elif "Next: EASIER" in feedback:
            return feedback, "easy"
        else:
            return feedback, "same"
    except Exception as e:
        print(json.dumps({"error": f"Error analyzing answer: {e}"}), file=sys.stderr)
        return "Error analyzing your answer. Please try again.", "same"


def main():
    print("Python script started...", file=sys.stderr)
    sys.stderr.flush()

    if len(sys.argv) < 2:
        print(json.dumps({"error": "Resume text is required"}), file=sys.stderr)
        sys.exit(1)

    resume_text = sys.argv[1]
    difficulty = "medium"
    results = []

    for i in range(5):  # Ask 5 questions for testing
        print(f"Asking question {i + 1}...", file=sys.stderr)
        sys.stderr.flush()

        question = ask_question(resume_text, difficulty)
        if not question:
            results.append({"error": "Failed to generate question"})
            continue

        print(
            json.dumps({"question": question}), file=sys.stdout
        )  # Send question to backend
        sys.stdout.flush()

        print("Generated question:", question, file=sys.stderr)
        sys.stderr.flush()

        speak(question)
        time.sleep(2)

        print("Listening for answer...", file=sys.stderr)
        sys.stderr.flush()
        answer = listen()
        print("Received answer:", answer, file=sys.stderr)
        sys.stderr.flush()

        feedback, next_difficulty = analyze_answer(question, answer)

        print(
            json.dumps({"feedback": feedback}), file=sys.stdout
        )  # Send feedback to backend
        sys.stdout.flush()

        print("Feedback:", feedback, file=sys.stderr)
        sys.stderr.flush()

        speak(feedback)
        time.sleep(2)

        difficulty = next_difficulty

    print("Python script finished execution.", file=sys.stderr)
    sys.stderr.flush()
    sys.exit(0)  # ✅ Ensure it exits properly


if __name__ == "__main__":
    main()
