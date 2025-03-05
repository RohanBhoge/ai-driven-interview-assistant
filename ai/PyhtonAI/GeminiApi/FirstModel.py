import os
import google.generativeai as genai
from PyPDF2 import PdfReader
from dotenv import load_dotenv
import speech_recognition as sr
from gtts import gTTS
import pygame
import time
import tempfile

# Load API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize audio system once
pygame.mixer.init()
recognizer = sr.Recognizer()


def speak(text):
    """Convert text to speech with proper audio queuing"""
    if not text.strip():
        print("⚠️ No text to speak!")
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
        print(f"Audio error: {e}")


def listen():
    """Capture voice input with better pause handling"""
    with sr.Microphone() as source:
        print("\n🎤 Listening... (Speak now)")
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
            print(f"🗣️ Full answer captured: {text}")
            return text
        except sr.WaitTimeoutError:
            print("⌛ No speech detected after 10 seconds")
            return ""
        except sr.UnknownValueError:
            print("🔇 Couldn't understand audio")
            return ""
        except Exception as e:
            print(f"🎤 Error: {e}")
            return ""


# In ask_question function - REMOVE the speak() call here
def ask_question(resume_text, difficulty="medium"):
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""  
    Act as an interviewer. Ask one {difficulty}-level technical question based on this resume:  
    {resume_text}  
    Return ONLY the question (no extra text).  
    """
    try:
        response = model.generate_content(prompt)
        question = response.text
        return question  # Only return the question, don't speak here
    except Exception as e:
        print(f"Error generating question: {e}")
        return None


# Step 1: Parse Resume PDF
def read_resume(pdf_path):
    print("Reading your resume... 📄")
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text


# Step 5: Analyze Answer
def analyze_answer(question, answer):
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
        print(f"Raw Feedback: {feedback}")  # Debugging line

        # Extract the difficulty adjustment from the feedback
        if "Next: HARDER" in feedback:
            return feedback, "hard"
        elif "Next: EASIER" in feedback:
            return feedback, "easy"
        else:
            return feedback, "same"
    except Exception as e:
        print(f"Error analyzing answer: {e}")
        return "Error analyzing your answer. Please try again.", "same"


# Step 6: Run the Voice-Based Interview
def start_interview():
    resume_path = input("Drag & drop your resume PDF here: ").strip('"')
    resume_text = read_resume(resume_path)
    difficulty = "medium"

    for i in range(3):
        question = ask_question(resume_text, difficulty)
        if not question:
            continue

        # First show the question
        print(f"\n📝 Question {i+1}: {question}")

        # Then speak it after 1 second
        time.sleep(1)
        speak(question)

        # Add listening indicator
        print(
            "\n💡 After the audio finishes, you'll have 3 seconds to start speaking..."
        )
        time.sleep(2)  # Pause after question audio

        answer = listen()
        print(f"\n📋 Your answer: {answer}" if answer else "🔇 No response recorded")

        # Add processing indicator
        print("\n⏳ Analyzing your answer...")
        feedback, next_difficulty = analyze_answer(question, answer)

        # Show feedback first
        print(f"\n✅ Feedback: {feedback}")

        # Then speak it after 1 second
        time.sleep(1)
        speak(feedback)

        difficulty = next_difficulty
        time.sleep(2)  # Pause before next question

    print("\n🎯 Interview Complete!")


# Start the program!
if __name__ == "__main__":
    start_interview()
