import speech_recognition as sr
import google.generativeai as genai
from openai import OpenAI
from faster_whisper import WhisperModel
import pyaudio
import os
import io

# Configuration
wake_word = "gemini"
listen_for_wake_word = True
whisper_size = "base"
OPENAI_KEY = "sk-your-openai-key"  # Replace with your actual key
GEMINI_KEY = "your-gemini-key"  # Replace with your actual key

# Initialize models
genai.configure(api_key=GEMINI_KEY)
openai_client = OpenAI(api_key=OPENAI_KEY)

# Initialize Whisper
num_cores = os.cpu_count()
whisper_model = WhisperModel(
    whisper_size,
    device="cpu",  # Fixed typo from 'dive' to 'device'
    compute_type="int8",
    cpu_threads=num_cores,
    num_workers=num_cores,
)

# Initialize Gemini
generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

safety_settings = {
    genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH: genai.types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai.types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
}

gemini = genai.GenerativeModel(
    "gemini-1.5-flash",
    generation_config=generation_config,
    safety_settings=safety_settings,
)
convo = gemini.start_chat(history=[])

# System message setup
system_message = """You are a voice assistant. Respond concisely and clearly. 
Keep responses brief and to the point. Use natural language for speech."""
convo.send_message(system_message)

# Audio configuration
p = pyaudio.PyAudio()
recognizer = sr.Recognizer()
microphone = sr.Microphone()


def speak(text):
    """Convert text to speech using OpenAI's TTS and play it"""
    try:
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text,
            response_format="pcm",  # Using raw PCM format for direct playback
        )

        # Create in-memory buffer
        audio_buffer = io.BytesIO()
        for chunk in response.iter_bytes():
            audio_buffer.write(chunk)

        audio_buffer.seek(0)
        audio_data = audio_buffer.read()

        # Play audio directly
        stream = p.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)
        stream.write(audio_data)
        stream.stop_stream()
        stream.close()

    except Exception as e:
        print(f"Error in speech synthesis: {e}")


def transcribe_audio(audio_data):
    """Transcribe audio using Whisper"""
    try:
        segments, info = whisper_model.transcribe(audio_data)
        return " ".join(segment.text for segment in segments)
    except Exception as e:
        print(f"Transcription error: {e}")
        return None


def listen_for_wake_word():
    """Listen continuously for the wake word"""
    with microphone as source:
        print("Calibrating microphone...")
        recognizer.adjust_for_ambient_noise(source, duration=2)
        print(f"Listening for wake word '{wake_word}'...")

        while True:
            try:
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=3)
                with io.BytesIO() as buffer:
                    buffer.write(audio.get_wav_data())
                    buffer.seek(0)
                    text = transcribe_audio(buffer)

                if text and wake_word in text.lower():
                    print("Wake word detected!")
                    return True

            except sr.WaitTimeoutError:
                continue
            except Exception as e:
                print(f"Listening error: {e}")
                continue


def process_command():
    """Process user command after wake word"""
    with microphone as source:
        print("Listening for command...")
        try:
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
            with io.BytesIO() as buffer:
                buffer.write(audio.get_wav_data())
                buffer.seek(0)
                command = transcribe_audio(buffer)

            if command:
                print(f"User command: {command}")
                convo.send_message(command)
                response = convo.last.text
                print(f"Assistant: {response}")
                speak(response)
            else:
                speak("I didn't catch that. Please try again.")

        except sr.WaitTimeoutError:
            speak("I didn't hear anything. Going back to sleep.")
        except Exception as e:
            print(f"Command processing error: {e}")
            speak("Sorry, I encountered an error.")


def main():
    """Main loop"""
    try:
        while True:
            if listen_for_wake_word():
                process_command()
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        p.terminate()


if __name__ == "__main__":
    main()
