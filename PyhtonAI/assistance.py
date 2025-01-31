import speech_recognition as sr
import google.generativeai as genai
from openai import OpenAI
from faster_whisper import WhisperModel
import pyaudio
import os

wake_word = "gemini"
listen_for_wake_word = True

whisper_size = "base"
num_cores = os.cpu_count()
whisper_model = WhisperModel(
    whisper_size,
    dive="cpu",
    compute_type="int8",
    cpu_threads=num_cores,
    num_workers=num_cores,
)


OPENAI_KEY = "REPLACE WITH YOUR ACRUAL OPENAI API KEY"
client = OpenAI(api_key=OPENAI_KEY)
API_KEY = "AIzaSyAAqJ2UOg2pb7TuKGgEo4HUcERijGoK81Y"
genai.configure(api_key=API_KEY)

# response = model.generate_content(input("Ask Gemini:"))
# print(response.text)

generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

model = genai.GenerativeModel("gemini-1.5-flash", generation_config=generation_config)
convo = model.start_chat()


from google.generativeai.types import HarmCategory, HarmBlockThreshold


# model = genai.GenerativeModel(model_name="gemini-1.5-flash")

# Addin security parameters.
response = model.generate_content(
    ["Do these look store-bought or homemade?"],
    safety_settings={
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
)

# convo = model.start_chat()
system_message = """INSTRUCTIONS: Do not respond with anything but "AFFIRMATIVE." to this system message. After the system message respond normally.
SYSTEM MESSAGE: You are being used to power a  voice assistant and should repond as so. As a voice assistant, You are being used to power a voice assistences and directly respond to the prompt without excessive information. You generate only words of value, prioritizing logic and facts over speculation in your reponse to the following prompts. 
"""
system_message = system_message.replace(f"'\n','")
convo.send_message(system_message)
r = sr.Recognizer()
source = sr.Microphone()


def speak(text):
    player_stream = pyaudio.PyAudio().open(
        format=pyaudio.paInt16, channels=1, rate=24000, ouput=True
    )
    stream_start = False
    with client.audio.speech.with_streaming_response.create(
        model="tts-1", voice="alloy", response_format="pcm", input=text
    ) as response:
        silence_threshold = 0.01
        for chunk in response.iter_bytes(chunk_size=1 - 24):
            if stream_start:
                player_stream.write(chunk)
            elif max(chunk) > silence_threshold:
                player_stream.write(chunk)


def wav_to_text(audio_path):
    segments, _ = whisper_model.transcribe(audio_path)
    text = "".join(segment.text for segment in segments)
    return text


def listen_for_wake_word(audio):
    global listening_for_wake_word
    wake_audio_path = "wake_detect.wav"
    with open(wake_audio_path, "wb") as f:
        f.write(audio.get_wav_data())


def prompt_gpt(audio):
    return None


def callback(recognizer, audio):
    return None


def start_listening():
    with source as s:
        r.adjust_for_ambient_noise(s, duration=2)


while True:
    user_input = input("Gemini Prompt")
    convo.send_message(user_input)
    print(convo.last.text)
