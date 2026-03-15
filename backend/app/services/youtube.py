from typing import Any

import yt_dlp

from app.core.config import settings


class YoutubeService:
    @staticmethod
    def search_songs(query: str) -> list[dict[str, Any]]:
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "force_generic_extractor": False,
            "default_search": "ytsearch10",
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(f"ytsearch10:{query}", download=False)
            songs = []
            if "entries" in result:
                for entry in result["entries"]:
                    songs.append(
                        {
                            "id": entry.get("id"),
                            "title": entry.get("title"),
                            "uploader": entry.get("uploader", "Unknown"),
                            "thumbnail": entry.get("thumbnail")
                            or (entry.get("thumbnails")[0]["url"] if entry.get("thumbnails") else ""),
                            "duration": entry.get("duration", 0),
                        }
                    )
            return songs

    @staticmethod
    def get_stream_info(video_id: str) -> dict[str, Any]:
        ydl_opts = {
            "format": "bestaudio/best",
            "quiet": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {
                "url": info["url"],
                "title": info["title"],
                "thumbnail": info.get("thumbnail"),
            }

    @staticmethod
    def download_song(video_id: str) -> dict[str, Any]:
        output_template = f"{settings.DOWNLOADS_DIR}/{video_id}.%(ext)s"
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "quiet": True,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_id, download=True)
            filename = f"{settings.DOWNLOADS_DIR}/{video_id}.mp3"
            return {
                "filename": filename,
                "title": info.get("title", video_id),
            }

    @staticmethod
    def extract_playlist_info(url: str) -> list[dict[str, Any]]:
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "ignoreerrors": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            songs = []
            if "entries" in info:
                for entry in info["entries"]:
                    if entry is None:
                        continue  # Skip if entry failed to extract
                    songs.append(
                        {
                            "id": entry.get("id"),
                            "title": entry.get("title"),
                            "uploader": entry.get('uploader') or entry.get('channel') or "Unknown Artist",
                            "thumbnail": entry.get("thumbnail")
                            or (entry.get("thumbnails")[0]["url"] if entry.get("thumbnails") else ""),
                            "duration": entry.get("duration", 0),
                        }
                    )
            return songs


youtube_service = YoutubeService()
