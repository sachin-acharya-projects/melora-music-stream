import re
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ytmusicapi import YTMusic

from app.core.redis import get_redis
from app.db.models.song import SongModel
from app.schemas.lyrics import LyricLine, LyricsResponse

_LRC_TIMESTAMP = re.compile(r"\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]")
_MILLISECOND_DIGITS = 3


class LyricsService:
    """Fetch lyrics from LRCLIB, falling back to YouTube Music."""

    LRCLIB_URL = "https://lrclib.net/api/get"
    CACHE_TTL = 60 * 60 * 24 * 7  # 7 days
    MISS_TTL = 60 * 60  # 1 hour for negative results

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
            raise HTTPException(status_code=404, detail="Song not found")
        return self.get_lyrics(
            title=song.title or song_id,
            artist=song.uploader or "Unknown Artist",
            duration=song.duration,
        )

    def get_lyrics(
        self, *, title: str, artist: str, duration: int | None
    ) -> LyricsResponse:
        """Fetch and cache lyrics for a track, trying LRCLIB then YouTube Music."""
        cache = get_redis()
        cache_key = self._cache_key(title, artist, duration)
        cached = cache.get(cache_key)
        if cached is not None:
            return LyricsResponse.model_validate(cached)

        result = self.fetch_lrclib(title, artist, duration)
        if result is None or not result.lines:
            result = self.fetch_ytmusic(title, artist)
        if result is None:
            result = LyricsResponse(synced=False, lines=[])

        ttl = self.CACHE_TTL if result.lines else self.MISS_TTL
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
            response = httpx.get(LyricsService.LRCLIB_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
        except (httpx.HTTPError, ValueError):
            return None

        synced = data.get("syncedLyrics")
        if synced:
            lines = LyricsService.parse_lrc(synced)
            if lines:
                return LyricsResponse(synced=True, lines=lines)

        plain = data.get("plainLyrics")
        if plain:
            lines = LyricsService.plain_lines(plain)
            if lines:
                return LyricsResponse(synced=False, lines=lines)
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
        except (AttributeError, TypeError, ValueError, KeyError, IndexError):
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
                return LyricsResponse(synced=True, lines=timed)
        plain = lyrics.get("lyrics")
        if isinstance(plain, str) and plain.strip():
            lines = LyricsService.plain_lines(plain)
            if lines:
                return LyricsResponse(synced=False, lines=lines)
        return None


lyrics_service = LyricsService()
