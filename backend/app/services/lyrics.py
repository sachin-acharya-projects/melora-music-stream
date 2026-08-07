import html
import re
from typing import Any

import httpx
import yt_dlp
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ytmusicapi import YTMusic

from app.core.config import settings
from app.core.messages import Messages
from app.core.redis import get_redis
from app.db.models.song import SongModel
from app.schemas.lyrics import LyricLine, LyricsResponse

_LRC_TIMESTAMP = re.compile(r"\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]")
_VTT_TAG = re.compile(r"<[^>]+>")
_MILLISECOND_DIGITS = 3
_CAPTION_LANG_PRIORITY = ("ne", "en", "en-US", "en-GB", "en-orig")


class LyricsService:
    """Fetch lyrics from LRCLIB, falling back to YouTube Music."""

    def __init__(self) -> None:
        self._ytmusic: Any | None = None

    def _get_ytmusic(self) -> Any:  # noqa: ANN401
        if self._ytmusic is None:
            self._ytmusic = YTMusic()
        return self._ytmusic

    def get_lyrics_for_song(self, db: Session, song_id: str) -> LyricsResponse:
        """Return lyrics for a stored song, raising 404 if it is unknown."""
        song = db.query(SongModel).filter(SongModel.id == song_id).first()
        if song is None:
            raise HTTPException(status_code=404, detail=Messages.SONG_NOT_FOUND)
        return self.get_lyrics(
            title=song.title or song_id,
            artist=song.uploader or "Unknown Artist",
            duration=song.duration,
            video_id=song.id,
        )

    def get_lyrics(
        self,
        *,
        title: str,
        artist: str,
        duration: int | None,
        video_id: str | None = None,
    ) -> LyricsResponse:
        """Fetch and cache lyrics, trying LRCLIB, then YouTube Music, then captions."""
        cache = get_redis()
        cache_key = self._cache_key(title, artist, duration)
        cached = cache.get(cache_key)
        if cached is not None:
            return LyricsResponse.model_validate(cached)

        result = self.fetch_lrclib(title, artist, duration)
        if result is None or not result.lines:
            result = self.fetch_ytmusic(title, artist)
        if result is None or not result.lines:
            result = self.fetch_captions(video_id) if video_id else None
        if result is None:
            result = LyricsResponse(synced=False, lines=[])

        ttl = (
            settings.LYRICS_CACHE_TTL_SECONDS
            if result.lines
            else settings.LYRICS_MISS_TTL_SECONDS
        )
        cache.set(cache_key, result.model_dump(), ttl)
        return result

    @staticmethod
    def _cache_key(title: str, artist: str, duration: int | None) -> str:
        return f"lyrics:{title}|{artist}|{duration}".lower()

    @staticmethod
    def fetch_lrclib(
        title: str, artist: str, duration: int | None
    ) -> LyricsResponse | None:
        """Query LRCLIB for synced or plain lyrics."""
        params: dict[str, str | int] = {"track_name": title, "artist_name": artist}
        if duration:
            params["duration"] = duration
        try:
            response = httpx.get(settings.LRCLIB_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
        except (httpx.HTTPError, ValueError):
            return None

        synced = data.get("syncedLyrics")
        if synced:
            lines = LyricsService.parse_lrc(synced)
            if lines:
                return LyricsResponse(synced=True, lines=lines, source="lrclib")

        plain = data.get("plainLyrics")
        if plain:
            lines = LyricsService.plain_lines(plain)
            if lines:
                return LyricsResponse(synced=False, lines=lines, source="lrclib")
        return None

    @staticmethod
    def parse_lrc(lrc: str) -> list[LyricLine]:
        """Parse LRC text into timed lines, repeating text for stacked timestamps."""
        lines: list[LyricLine] = []
        for raw_line in lrc.splitlines():
            text = _LRC_TIMESTAMP.sub("", raw_line).strip()
            if not text:
                continue
            matches = _LRC_TIMESTAMP.findall(raw_line)
            for minutes, seconds, fraction in matches:
                time_seconds: float = int(minutes) * 60 + int(seconds)
                if fraction:
                    # Two digits are centiseconds, three are milliseconds.
                    divisor = 1000 if len(fraction) == _MILLISECOND_DIGITS else 100
                    time_seconds += int(fraction) / divisor
                lines.append(LyricLine(time=time_seconds, text=text))
        return lines

    @staticmethod
    def plain_lines(text: str) -> list[LyricLine]:
        return [
            LyricLine(text=line.strip()) for line in text.splitlines() if line.strip()
        ]

    def fetch_ytmusic(self, title: str, artist: str) -> LyricsResponse | None:
        """Query YouTube Music for synced or plain lyrics."""
        try:
            results = self._get_ytmusic().search(
                f"{title} {artist}".strip(), filter="songs", limit=1
            )
            if not results:
                return None
            browse_id = results[0].get("browseId") or results[0].get("videoId")
            if not browse_id:
                return None
            lyrics = self._get_ytmusic().get_lyrics(browse_id, timestamps=True)
        except Exception:
            # Any provider error degrades gracefully to "no lyrics".
            return None
        return LyricsService._ytmusic_to_response(lyrics)

    @staticmethod
    def _ytmusic_to_response(lyrics: Any) -> LyricsResponse | None:  # noqa: ANN401
        if lyrics is None:
            return None
        if lyrics.get("hasTimestamps"):
            timed = [
                LyricLine(time=line.start_time / 1000, text=line.text)
                for line in lyrics.get("lyrics", [])
                if getattr(line, "text", "")
            ]
            if timed:
                return LyricsResponse(synced=True, lines=timed, source="ytmusic")
        plain = lyrics.get("lyrics")
        if isinstance(plain, str) and plain.strip():
            lines = LyricsService.plain_lines(plain)
            if lines:
                return LyricsResponse(synced=False, lines=lines, source="ytmusic")
        return None

    def fetch_captions(self, video_id: str) -> LyricsResponse | None:
        """Fetch timed-text captions for a video as a last-resort lyric source."""
        try:
            with yt_dlp.YoutubeDL({"skip_download": True, "socket_timeout": 10}) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={video_id}", download=False
                )
            captions = info.get("subtitles") or info.get("automatic_captions")
            url = self._pick_caption_url(captions)
            if not url:
                return None
            response = httpx.get(url, timeout=10)
            response.raise_for_status()
            lines = LyricsService.parse_vtt(response.text)
        except Exception:
            # Any provider error degrades gracefully to "no captions".
            return None
        if not lines:
            return None
        return LyricsResponse(synced=True, lines=lines, source="captions")

    @staticmethod
    def _pick_caption_url(
        captions: dict[str, list[dict[str, Any]]] | None,
    ) -> str | None:
        """Pick a caption track URL, preferring Nepali then English, else any."""
        if not captions:
            return None
        for lang in _CAPTION_LANG_PRIORITY:
            entries = captions.get(lang)
            if entries:
                return entries[0].get("url")
        first = next(iter(captions.values()), None)
        if first:
            return first[0].get("url")
        return None

    @staticmethod
    def parse_vtt(vtt: str) -> list[LyricLine]:
        """Parse WebVTT text into timed lines, merging multi-line cues."""
        lines: list[LyricLine] = []
        start: float | None = None
        text_parts: list[str] = []
        for raw in vtt.splitlines():
            stripped = raw.strip()
            if "-->" in stripped:
                if start is not None and text_parts:
                    lines.append(LyricLine(time=start, text=" ".join(text_parts)))
                start = LyricsService._vtt_timestamp(stripped.split("-->")[0])
                text_parts = []
            elif not stripped:
                if start is not None and text_parts:
                    lines.append(LyricLine(time=start, text=" ".join(text_parts)))
                start = None
                text_parts = []
            elif start is not None and not stripped.startswith("NOTE"):
                text_parts.append(LyricsService._strip_vtt_tags(stripped))
        if start is not None and text_parts:
            lines.append(LyricLine(time=start, text=" ".join(text_parts)))
        return lines

    @staticmethod
    def _vtt_timestamp(value: str) -> float:
        """Convert a VTT timestamp (HH:MM:SS.mmm) to fractional seconds."""
        total = 0.0
        for part in value.strip().split(":"):
            total = total * 60 + float(part)
        return total

    @staticmethod
    def _strip_vtt_tags(text: str) -> str:
        return html.unescape(_VTT_TAG.sub("", text)).strip()


lyrics_service = LyricsService()
