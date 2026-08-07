from __future__ import annotations

import logging
import re
import urllib.parse
from typing import Any, cast

import yt_dlp

from app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL_SEARCH_URL = (
    "https://www.youtube.com/results?search_query={query}&sp=EgIQAg%253D%253D"
)

UNAVAILABLE_AVAILABILITY = {"private", "premium", "subscriber_only"}
UNAVAILABLE_LIVE_STATUS = {"is_live", "is_upcoming"}
UNAVAILABLE_TITLE_PATTERN = re.compile(
    r"^\[?(private|deleted|unavailable)(\s*video)?\]?$", re.IGNORECASE
)


class YoutubeService:
    @staticmethod
    def _is_unavailable(entry: dict[str, Any]) -> bool:
        """Return True when a video entry is unavailable to stream.

        YouTube marks videos as unavailable when they are private, members-only,
        live/upcoming premieres, or have been removed. Flat extraction leaves
        such entries in results with placeholder titles, so filter them out
        before surfacing songs to the user.
        """
        if entry.get("availability") in UNAVAILABLE_AVAILABILITY:
            return True
        if entry.get("live_status") in UNAVAILABLE_LIVE_STATUS:
            return True
        title = entry.get("title")
        return isinstance(title, str) and bool(
            UNAVAILABLE_TITLE_PATTERN.match(title.strip())
        )

    @staticmethod
    def _resolve_thumbnail(info: dict[str, Any]) -> str:
        thumbnail = info.get("thumbnail")
        if thumbnail:
            return cast("str", thumbnail)
        thumbnails = info.get("thumbnails")
        if thumbnails:
            return cast("str", thumbnails[0]["url"])
        return ""

    @staticmethod
    def _channel_avatar(info: dict[str, Any]) -> str:
        """Pick the channel avatar from an extracted channel info dict.

        For channel pages the top-level thumbnail is the avatar; fall back to
        the highest-resolution thumbnail entry otherwise.
        """
        thumbnail = info.get("thumbnail")
        if isinstance(thumbnail, str):
            return thumbnail
        thumbnails = info.get("thumbnails")
        if isinstance(thumbnails, list):
            for entry in reversed(thumbnails):
                url = (entry or {}).get("url")
                if isinstance(url, str):
                    return url
        return ""

    @staticmethod
    def _extract_links(text: str) -> list[str]:
        links = re.findall(r"https?://[^\s<>]+", text or "")
        cleaned: list[str] = []
        seen: set[str] = set()
        for link in links:
            clean = link.rstrip(".,;:!?)]}")
            if clean not in seen:
                seen.add(clean)
                cleaned.append(clean)
        return cleaned

    @staticmethod
    def _channels_from_search(
        entries: list[Any], *, limit: int
    ) -> list[dict[str, Any]]:
        """Parse channel results from a YouTube channel-filtered search."""
        channels: list[dict[str, Any]] = []
        seen: set[str] = set()
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            channel_id = entry.get("channel_id")
            if not channel_id or channel_id in seen:
                continue
            seen.add(channel_id)
            channels.append(
                {
                    "channel_id": cast("str", channel_id),
                    "name": entry.get("channel")
                    or entry.get("uploader")
                    or "Unknown Artist",
                    "thumbnail": YoutubeService._channel_avatar(entry),
                    "subscribers": entry.get("channel_follower_count"),
                    "url": f"https://www.youtube.com/channel/{channel_id}",
                }
            )
            if len(channels) >= limit:
                break
        return channels

    @staticmethod
    def search_artists(query: str, *, limit: int = 6) -> list[dict[str, Any]]:
        """Search YouTube for channels matching the query.

        Uses YouTube's channel-filtered search URL (sp=EgIQAg) so the results
        are actual channels rather than uploaders of matching videos.
        """
        url = CHANNEL_SEARCH_URL.format(query=urllib.parse.quote_plus(query))
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "skip_download": True,
            "ignoreerrors": True,
            "playlistend": limit,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        entries = info.get("entries") if isinstance(info, dict) else None
        return YoutubeService._channels_from_search(entries or [], limit=limit)

    @staticmethod
    def get_channel_metadata(channel_id: str) -> dict[str, Any]:
        """Resolve a channel's avatar, description, stats, and links."""
        url = f"https://www.youtube.com/channel/{channel_id}"
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "skip_download": True,
            "ignoreerrors": True,
            "playlistend": 1,
            "socket_timeout": 10,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception:
            logger.warning(
                "Failed to resolve channel metadata for %s", channel_id, exc_info=True
            )
            return {}
        if not isinstance(info, dict):
            return {}
        description = info.get("description") or ""
        return {
            "name": info.get("channel") or info.get("uploader") or "",
            "thumbnail": YoutubeService._channel_avatar(info),
            "description": description,
            "subscribers": info.get("channel_follower_count"),
            "view_count": info.get("view_count"),
            "video_count": info.get("video_count"),
            "country": info.get("country"),
            "is_verified": bool(info.get("channel_is_verified")),
            "handle": info.get("uploader_id"),
            "channel_url": info.get("channel_url") or url,
            "links": YoutubeService._extract_links(description),
        }

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
                    if not entry or not entry.get("id"):
                        continue
                    if YoutubeService._is_unavailable(entry):
                        continue
                    songs.append(
                        {
                            "id": entry.get("id"),
                            "title": entry.get("title"),
                            "uploader": entry.get("uploader", "Unknown"),
                            "thumbnail": entry.get("thumbnail")
                            or (
                                entry.get("thumbnails")[0]["url"]
                                if entry.get("thumbnails")
                                else ""
                            ),
                            "duration": entry.get("duration", 0),
                        }
                    )
            return songs

    @staticmethod
    def get_channel_uploads(
        channel_id: str, *, limit: int = 50
    ) -> list[dict[str, Any]]:
        """Return the most recent uploads from a YouTube channel's Videos tab."""
        url = f"https://www.youtube.com/channel/{channel_id}/videos"
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "ignoreerrors": True,
            "playlistend": limit,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not isinstance(info, dict):
                return []
            channel_name = info.get("channel") or info.get("uploader")
            entries = info.get("entries") or []
            songs = []
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                # Skip channel-tab navigation entries ("X - Videos") that carry
                # the channel id instead of a video id.
                if not entry.get("id") or not entry.get("url"):
                    continue
                if entry["id"] == channel_id:
                    continue
                if entry.get("duration") is None:
                    continue
                if YoutubeService._is_unavailable(entry):
                    continue
                songs.append(
                    {
                        "id": entry.get("id"),
                        "title": entry.get("title"),
                        "uploader": entry.get("channel")
                        or entry.get("uploader")
                        or channel_name
                        or "Unknown Artist",
                        "thumbnail": YoutubeService._resolve_thumbnail(entry),
                        "duration": entry.get("duration", 0),
                    }
                )
            return songs

    @staticmethod
    def get_channel_playlists(
        channel_id: str, *, limit: int = 12
    ) -> list[dict[str, Any]]:
        """Return the playlists a YouTube channel has published."""
        url = f"https://www.youtube.com/channel/{channel_id}/playlists"
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "ignoreerrors": True,
            "playlistend": limit,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            entries = info.get("entries") if isinstance(info, dict) else None
            playlists = []
            for entry in entries or []:
                if entry is None or not entry.get("id"):
                    continue
                if not str(entry["id"]).startswith("PL"):
                    continue
                playlists.append(
                    {
                        "id": entry["id"],
                        "name": entry.get("title") or "Untitled Playlist",
                        "url": f"https://www.youtube.com/playlist?list={entry['id']}",
                    }
                )
            return playlists

    @staticmethod
    def get_playlist_songs(
        playlist_id: str, *, limit: int = 30
    ) -> list[dict[str, Any]]:
        """Return songs from a YouTube playlist."""
        url = f"https://www.youtube.com/playlist?list={playlist_id}"
        ydl_opts = {
            "quiet": True,
            "extract_flat": True,
            "ignoreerrors": True,
            "playlistend": limit,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            entries = info.get("entries") if isinstance(info, dict) else None
            songs = []
            for entry in entries or []:
                if entry is None or not entry.get("id"):
                    continue
                if YoutubeService._is_unavailable(entry):
                    continue
                songs.append(
                    {
                        "id": entry.get("id"),
                        "title": entry.get("title"),
                        "uploader": entry.get("uploader")
                        or entry.get("channel")
                        or "Unknown Artist",
                        "thumbnail": YoutubeService._resolve_thumbnail(entry),
                        "duration": entry.get("duration", 0),
                    }
                )
            return songs

    @staticmethod
    def get_stream_info(video_id: str) -> dict[str, Any]:
        ydl_opts = {
            "format": "bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "nocheckcertificate": True,
            "referer": "https://www.youtube.com/",
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web"],
                    "player_skip": ["webpage", "configs"],
                }
            },
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Passing the video ID directly is often more reliable than the full URL
            info = ydl.extract_info(video_id, download=False)
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
            entries = info.get("entries") if isinstance(info, dict) else None
            if entries:
                for entry in entries:
                    if entry is None:
                        continue  # Skip if entry failed to extract
                    if YoutubeService._is_unavailable(entry):
                        continue
                    songs.append(
                        {
                            "id": entry.get("id"),
                            "title": entry.get("title"),
                            "uploader": entry.get("uploader")
                            or entry.get("channel")
                            or "Unknown Artist",
                            "thumbnail": YoutubeService._resolve_thumbnail(entry),
                            "duration": entry.get("duration", 0),
                        }
                    )
            elif isinstance(info, dict):
                # Single video URL (watch), not a playlist
                if YoutubeService._is_unavailable(info):
                    return songs
                songs.append(
                    {
                        "id": info.get("id"),
                        "title": info.get("title"),
                        "uploader": info.get("uploader")
                        or info.get("channel")
                        or "Unknown Artist",
                        "thumbnail": YoutubeService._resolve_thumbnail(info),
                        "duration": info.get("duration", 0),
                    }
                )
            return songs


youtube_service = YoutubeService()
