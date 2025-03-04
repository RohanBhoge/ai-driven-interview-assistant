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

# Initialize Speech Recognizer
recognizer = sr.Recognizer()


# Step 1: Parse Resume PDF
def read_resume(pdf_path):
    print("Reading your resume... 📄")
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

    # Step 2: Convert text to speech and play
    # def speak(text):
    #     print(f"AI: {text}")  # Debugging text output
    #     tts = gTTS(text=text, lang="en")
    #     tts.save("question.mp3")

    #     # Play the audio
    #     pygame.mixer.init()
    #     pygame.mixer.music.load("question.mp3")
    #     pygame.mixer.music.play()

    #     while pygame.mixer.music.get_busy():
    #         continue  # Wait until the speech finishes playing

    # def speak(text):
    #     save_path = os.path.join(
    #         os.getcwd(), "audio"
    #     )  # Create an 'audio' folder in the current directory
    #     os.makedirs(save_path, exist_ok=True)  # Ensure the folder exists
    #     file_path = os.path.join(save_path, "question.mp3")  # Full path for the file

    #     tts = gTTS(text=text, lang="en")
    #     tts.save(file_path)  # Save file in 'audio' folder

    #     pygame.mixer.init()
    #     pygame.mixer.music.load(file_path)
    #     pygame.mixer.music.play()

    #     while pygame.mixer.music.get_busy():
    #         pygame.time.Clock().tick(10)

    # def speak(text):
    #     # Use a directory with write permissions
    #     save_path = os.path.join(os.path.expanduser("~"), "Documents", "AI_Audio")
    #     os.makedirs(save_path, exist_ok=True)  # Ensure the folder exists

    #     file_path = os.path.join(save_path, "question.mp3")  # Store in AI_Audio folder

    #     tts = gTTS(text=text, lang="en")
    #     tts.save(file_path)  # Save to the new directory

    #     pygame.mixer.init()
    #     pygame.mixer.music.load(file_path)
    #     pygame.mixer.music.play()

    #     while pygame.mixer.music.get_busy():
    #         pygame.time.Clock().tick(10)

    # def speak(text):
    if not text or text.strip() == "":
        print("⚠️ No valid text to speak!")
        return

    save_path = os.path.join(os.getcwd(), "audio")
    os.makedirs(save_path, exist_ok=True)
    file_path = os.path.join(save_path, "question.mp3")

    try:
        tts = gTTS(text=text, lang="en")
        tts.save(file_path)

        pygame.mixer.quit()  # Ensure clean initialization
        pygame.mixer.init()
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()

        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)

    except Exception as e:
        print(f"Error in speak(): {e}")


def speak(text):
    try:
        pygame.mixer.init()
        pygame.mixer.music.stop()  # Stop any ongoing audio
        time.sleep(0.5)  # Short delay before playing new audio

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_audio:
            audio_path = temp_audio.name

        tts = gTTS(text)
        tts.save(audio_path)

        pygame.mixer.music.load(audio_path)
        pygame.mixer.music.play()

        while pygame.mixer.music.get_busy():
            time.sleep(0.5)

        os.remove(audio_path)

    except Exception as e:
        print(f"Error in speak(): {e}")


# Step 3: Capture user's voice response and transcribe it
# def listen():
#     with sr.Microphone() as source:
#         print("Listening for your response... 🎤")
#         recognizer.adjust_for_ambient_noise(source)
#         try:
#             audio = recognizer.listen(source, timeout=10)  # 10 seconds to answer
#             text = recognizer.recognize_google(audio)
#             print(f"You said: {text}")
#             return text
#         except sr.UnknownValueError:
#             print("Sorry, I couldn't understand that.")
#             return "I couldn't understand the answer."
#         except sr.RequestError:
#             print("Speech Recognition service is down.")
#             return "Error in processing."


# def listen():
#     with sr.Microphone() as source:
#         print("Listening for your response... 🎤")
#         recognizer.adjust_for_ambient_noise(source)
#         attempt = 0

#         while attempt < 3:  # Allow up to 3 attempts
#             try:
#                 audio = recognizer.listen(source, timeout=10)  # 10 seconds to answer
#                 text = recognizer.recognize_google(audio)
#                 print(f"You said: {text}")
#                 return text
#             except sr.UnknownValueError:
#                 print("I couldn't understand that. Please try again.")
#                 attempt += 1
#             except sr.RequestError:
#                 print("Speech Recognition service is down.")
#                 return "Error in processing."

#         return "No response detected."


def listen():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("🎤 Listening... (Speak clearly)")
        recognizer.adjust_for_ambient_noise(source)

        for attempt in range(3):  # Allow 3 attempts
            try:
                audio = recognizer.listen(source, timeout=10)
                text = recognizer.recognize_google(audio)
                print(f"🗣️ You said: {text}")
                return text
            except sr.UnknownValueError:
                print(f"⚠️ Couldn't understand. Attempt {attempt + 1}/3. Try again.")
            except sr.RequestError:
                print("❌ Speech Recognition service is down.")
                return "Error"

        return "No response detected."


# Step 4: Ask Questions with Voice
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
        speak(question)  # Convert text to speech
        return question
    except Exception as e:
        print(f"Error generating question: {e}")
        return None


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

    for i in range(3):  # Ask 3 questions
        question = ask_question(resume_text, difficulty)
        if not question:
            print("❌ Failed to generate a question. Trying again...")
            continue  # Skip to the next attempt

        print(f"\n📝 **Question {i+1}:** {question}")  # Display question on screen
        speak(question)  # Read the question aloud

        answer = listen()  # Capture answer via voice
        feedback, next_difficulty = analyze_answer(question, answer)

        print(f"\n✅ **Feedback:** {feedback}")  # Show feedback on screen
        speak(feedback)  # Speak the feedback

        difficulty = next_difficulty  # Adjust difficulty for the next question

    print("\n🎯 **Interview Complete!** 🎯")


# Start the program!
if __name__ == "__main__":
    start_interview()
