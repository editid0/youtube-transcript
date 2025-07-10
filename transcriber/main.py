import whisper, psycopg2
from dotenv import load_dotenv
import os

import whisper.utils

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


# Get videos from db where status is 0
def get_videos():
    """
    Fetches videos from the database where the status is 0.
    """
    with db_connection.cursor() as cursor:
        cursor.execute("SELECT yt_id FROM videos WHERE status = 1")
        return cursor.fetchall()


videos = [video[0] for video in get_videos()]
for video in videos:
    result = model.transcribe(f"../videos/{video}.mp3")

    segments = result["segments"]
    for segment in segments:
        if not segment:
            continue
        if not isinstance(segment, dict):
            continue
        if segment["text"].strip() == "":
            continue
        start: int = int(round(segment["start"]))
        end: int = int(round(segment["end"]))
        text: str = segment["text"]
        print(f"[{start:.2f}s - {end:.2f}s] {text.strip()}")
        with db_connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO segments (video_id, start_time, end_time, text)
                VALUES (%s, %s, %s, %s)
                """,
                (video, start, end, text.strip()),
            )
            db_connection.commit()
    # Remove the video from the directory
    os.remove(f"../videos/{video}.mp3")
    # Update the video status to 2 (processed)
    with db_connection.cursor() as cursor:
        cursor.execute("UPDATE videos SET status = 2 WHERE yt_id = %s", (video,))
        db_connection.commit()

# Close the database connection
db_connection.close()
