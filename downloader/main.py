import yt_dlp, os, psycopg2, base64
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

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
db_connection.set_client_encoding("UTF8")


# Create all necessary directories
def create_directories() -> None:
    """
    This function is ran at the start of the program,
    and attempts to created the directories the script
    needs.
    """
    videos_dir = Path("../videos")
    videos_dir.mkdir(exist_ok=True)

    return None


def download_audio(url: str) -> bool:
    """
    Download the audio of the video from the given URL.
    Returns True if successful, False otherwise.
    """
    ydl_opts = {
        "outtmpl": str(Path("../videos") / "%(id)s.%(ext)s"),
        "format": "bestaudio/best",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "ignoreerrors": False,
        "no_warnings": False,
        "extractflat": False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            return True
    except yt_dlp.DownloadError as e:
        print(f"Download error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error during download: {e}")
        return False


def extract_video_info(url: str) -> dict:
    """
    Extract information about the given video,
    for example title, description, channel, upload date,
    etc.
    """
    ydl_opts = {
        "quiet": True,  # Suppress download output when just extracting info
        "no_warnings": False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False) or {}
            title = info.get("title", "Unknown Title")
            upload_date = info.get("upload_date", "Unknown Date")
            upload_date = (
                datetime.strptime(upload_date, "%Y%m%d").date()
                if upload_date
                else "Unknown Date"
            )
            channel = info.get("uploader", "Unknown Channel")
            thumbnail = info.get("thumbnail", "No thumbnail available")
            id = info.get("id", "Unknown ID")
            duration = info.get("duration", "Unknown Duration")
            return {
                "title": title,
                "upload_date": upload_date,
                "channel": channel,
                "thumbnail": thumbnail,
                "id": id,
                "duration": duration,
            }
    except yt_dlp.DownloadError as e:
        print(f"Error extracting video info: {e}")
        return {}
    except Exception as e:
        print(f"Unexpected error extracting video info: {e}")
        return {}


def main(url):
    create_directories()
    video_info = extract_video_info(url)
    # Check if ID is already in the database
    with db_connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM videos WHERE yt_id = %s", (video_info["id"],))
        if cursor.fetchone():
            print(f"Video is already in the database.")
            return
        else:
            print(video_info["title"])
            # Insert video info into the database
            # videos {
            # 	id integer pk increments unique
            # 	yt_id varchar(11) unique
            # 	title text
            # 	upload_date datetime
            # 	channel_name text
            # 	duration integer
            # 	description text null
            # 	thumbnail text
            #   status INTEGER NOT NULL DEFAULT 0
            #   processed_date timestamp
            # }
            cursor.execute(
                """
                INSERT INTO videos (yt_id, title, upload_date, channel_name, duration, thumbnail, processed_date)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    video_info["id"],
                    video_info["title"],
                    video_info["upload_date"],
                    video_info["channel"],
                    video_info["duration"],
                    video_info["thumbnail"],
                ),
            )
            db_connection.commit()
    download_audio(url)
    # Update the status of the video to 1 (downloaded)
    with db_connection.cursor() as cursor:
        cursor.execute(
            "UPDATE videos SET status = 1 WHERE yt_id = %s", (video_info["id"],)
        )
        db_connection.commit()


if __name__ == "__main__":
    video_urls = []
    for url in video_urls:
        print(f"Processing {url}...")
        main(url)
        print(f"Finished processing {url}.")
    print("All videos processed.")
    db_connection.close()
