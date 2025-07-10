import yt_dlp, sys
from datetime import datetime
from pathlib import Path


# Create all necessary directories
def create_directories() -> None:
    """
    This function is ran at the start of the program,
    and attempts to created the directories the script
    needs.
    """
    videos_dir = Path("../videos")
    transcripts_dir = Path("../transcripts")
    videos_dir.mkdir(exist_ok=True)
    transcripts_dir.mkdir(exist_ok=True)

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
            description = info.get("description", "No description available")
            thumbnail = info.get("thumbnail", "No thumbnail available")
            id = info.get("id", "Unknown ID")
            duration = info.get("duration", "Unknown Duration")
            return {
                "title": title,
                "upload_date": upload_date,
                "channel": channel,
                "description": description,
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


def main():
    create_directories()
    URL = "https://www.youtube.com/watch?v=kfZOrjVXSms"
    download_audio(URL)
    video_info = extract_video_info(URL)
    if video_info:
        print("Video information extracted successfully:")
        for key, value in video_info.items():
            print(f"  {key}: {value}")
    else:
        print("Failed to extract video information.")


if __name__ == "__main__":
    main()
