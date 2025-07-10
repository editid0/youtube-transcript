import whisper, psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
DB_HOST, DB_USER, DB_PASS, DB_NAME = (
    os.getenv("DB_HOST"),
    os.getenv("DB_USER"),
    os.getenv("DB_PASS"),
    os.getenv("DB_NAME"),
)

db_connection = psycopg2.connect(
    host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME
)

model = whisper.load_model("base.en")
result = model.transcribe("../videos/kfZOrjVXSms.mp3")

segments = result["segments"]
for segment in segments:
    if not segment:
        continue
    if not isinstance(segment, dict):
        continue
    if segment["text"].strip() == "":
        continue
    start = segment["start"]
    end = segment["end"]
    text = segment["text"]
    print(f"[{start:.2f}s - {end:.2f}s] {text.strip()}")
