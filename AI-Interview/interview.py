import os
import sys
import contextlib
import json
import time
import tempfile
from PyPDF2 import PdfReader
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
    """Capture voice input with better pause handling"""
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source)
        recognizer.pause_threshold = 1.5  # Allow longer pauses
        recognizer.energy_threshold = 4000  # Adjust for background noise

        try:
            # Increased timeouts for better capture
            audio = recognizer.listen(
                source,
                timeout=10,  # Wait 10s for speech to start
                phrase_time_limit=30,  # Allow 30s answers
            )
            text = recognizer.recognize_google(audio)
            return text
        except sr.WaitTimeoutError:
            return ""
        except sr.UnknownValueError:
            return ""
        except Exception as e:
            print(
                json.dumps({"error": f"Voice recognition error: {e}"}), file=sys.stderr
            )
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
        question = response.text
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
        feedback = response.text

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

import sys


def main():
    print("Starting interview...", file=sys.stderr)
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Resume file path is required"}), file=sys.stderr)
        sys.exit(1)

    resume_file = sys.argv[1]
    with open(resume_file, "r") as file:
        resume_text = file.read()

    difficulty = "medium"
    results = []

    for i in range(3):  # Ask 3 questions
        print(f"Processing question {i + 1}...", file=sys.stderr)
        question = ask_question(resume_text, difficulty)
        if not question:
            results.append({"error": "Failed to generate question"})
            continue

        results.append({"type": "question", "text": question, "step": i + 1})

        # Speak the question (but don't print to stdout)
        speak(question)  # Speak the question aloud
        time.sleep(2)  # Pause after speaking the question

        # Capture answer
        print("Listening for answer...", file=sys.stderr)
        answer = listen()
        if not answer:
            answer = "No response detected."

        # Analyze answer
        print("Analyzing answer...", file=sys.stderr)
        feedback, next_difficulty = analyze_answer(question, answer)

        # Add feedback to results
        results.append(
            {"type": "feedback", "text": feedback, "nextDifficulty": next_difficulty}
        )

        # Speak feedback (but don't print to stdout)
        speak(feedback)  # Speak the feedback aloud
        time.sleep(2)  # Pause after speaking feedback

        # Update difficulty for next question
        difficulty = next_difficulty

    # Output results as JSON
    print(json.dumps(results), file=sys.stderr)
    print(json.dumps(results))  # Print JSON to stdout for Node.js


if __name__ == "__main__":
    main()
