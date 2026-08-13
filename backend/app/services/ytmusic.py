"""YouTube Music-backed song discovery.

YouTube Music is the same YouTube infrastructure, so every result it returns
is a plain video id that streams and downloads through the existing yt-dlp
pipeline. Discovery differs from plain YouTube search in quality: song
searches are filtered to individual tracks (no "best of X" mix compilations),
and curated mood/genre playlists, charts, and "related songs" come back as
real tracks instead of generic video results.

Every method degrades gracefully: on any failure it returns an empty result so
callers can fall back to the generic YouTube path. Results are cached in the
shared cache tiers (``cache_get_or_set``) for a day, which keeps YTMusic API
usage low.
"""

from __future__ import annotations

import functools
import logging
from typing import Any, cast

import requests
from ytmusicapi import YTMusic

from app.core.cache import cache_get_or_set
from app.core.config import settings

logger = logging.getLogger(__name__)


def _parse_release_date(value: Any) -> str | None:  # noqa: ANN401
    """Normalize a YTMusic releaseDate (string or dict) to ISO ``YYYY-MM-DD``.

    ytmusicapi may return either ``"2026-08-09"`` or a dict like
    ``{"year": 2026, "month": 8, "day": 9}``.
    """
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        year = value.get("year")
        month = value.get("month")
        day = value.get("day")
        if year:
            return (
                f"{int(year):04d}-{int(month or 1):02d}-{int(day or 1):02d}"
            )
    return None


def _pick_thumbnail(thumbnails: Any) -> str:  # noqa: ANN401
    """Pick the highest-resolution thumbnail URL from a YTMusic item."""
    if isinstance(thumbnails, list) and thumbnails:
        last = thumbnails[-1]
        if isinstance(last, dict):
            return last.get("url") or ""
    if isinstance(thumbnails, dict):
        return thumbnails.get("url") or ""
    return ""


def _parse_duration(value: Any) -> int:  # noqa: ANN401
    """Normalize a YTMusic duration into whole seconds.

    Handles the ``duration_seconds`` int, playlist ``length`` int, and the
    ``"3:45"``-style string search results sometimes carry.
    """
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return max(value, 0)
    if isinstance(value, str):
        total = 0
        for part in value.strip().split(":"):
            try:
                total = total * 60 + int(part)
            except ValueError:
                return 0
        return total
    return 0


def _normalize_track(track: dict[str, Any]) -> dict[str, Any]:
    """Map a YTMusic track dict onto the app's song shape (id = videoId)."""
    artists = track.get("artists") or []
    if artists and isinstance(artists[0], dict):
        uploader = artists[0].get("name") or "Unknown"
    else:
        uploader = track.get("artist") or "Unknown"
    duration = _parse_duration(
        track.get("duration_seconds") or track.get("length") or track.get("duration")
    )
    return {
        "id": track.get("videoId"),
        "title": track.get("title") or "Unknown Title",
        "uploader": uploader,
        "thumbnail": _pick_thumbnail(track.get("thumbnails")),
        "duration": duration,
    }


def _normalize_tracks(items: Any) -> list[dict[str, Any]]:  # noqa: ANN401
    """Normalize a list of YTMusic items, skipping entries without a video id."""
    songs: list[dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict) or not item.get("videoId"):
            continue
        songs.append(_normalize_track(item))
    return songs


def _normalize_search_artist(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("browseId"),
        "name": item.get("artist") or item.get("title") or "Unknown",
        "thumbnail": _pick_thumbnail(item.get("thumbnails")),
    }


def _normalize_search_album(item: dict[str, Any]) -> dict[str, Any]:
    artists = item.get("artists") or []
    return {
        "id": item.get("browseId"),
        "title": item.get("title") or "Untitled",
        "artists": [a.get("name") for a in artists if a.get("name")],
        "year": item.get("year"),
        "thumbnail": _pick_thumbnail(item.get("thumbnails")),
        "audio_playlist_id": item.get("audioPlaylistId"),
    }


def _normalize_search_playlist(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("playlistId"),
        "title": item.get("title") or "Untitled",
        "thumbnail": _pick_thumbnail(item.get("thumbnails")),
        "song_count": item.get("videoCount"),
    }


def _normalize_top_result(item: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize the top search result, tagged with its result type."""
    result_type = str(item.get("resultType") or "video").lower()
    if result_type in ("song", "video"):
        return {"type": result_type, **_normalize_track(item)}
    if result_type == "artist":
        return {"type": "artist", **_normalize_search_artist(item)}
    if result_type == "album":
        return {"type": "album", **_normalize_search_album(item)}
    if result_type == "playlist":
        return {"type": "playlist", **_normalize_search_playlist(item)}
    return None


def _partition_search_results(items: Any) -> dict[str, Any]:  # noqa: ANN401
    """Partition a YTMusic search payload into music-app style groups.

    Auto-generated stations, profiles, and podcasts are skipped; the first
    item becomes the ``top_result`` and is not duplicated into its group.
    """
    groups: dict[str, Any] = {
        "top_result": None,
        "artists": [],
        "songs": [],
        "albums": [],
        "playlists": [],
        "videos": [],
    }
    seen_song_ids: set[str] = set()
    for index, item in enumerate(items or []):
        if not isinstance(item, dict):
            continue
        if index == 0:
            groups["top_result"] = _normalize_top_result(item)
            continue
        result_type = str(item.get("resultType") or "video").lower()
        if result_type == "artist":
            groups["artists"].append(_normalize_search_artist(item))
        elif result_type in ("song", "video"):
            song = _normalize_track(item)
            if song["id"] and song["id"] not in seen_song_ids:
                seen_song_ids.add(song["id"])
                groups["songs" if result_type == "song" else "videos"].append(song)
        elif result_type in ("album", "single"):
            groups["albums"].append(_normalize_search_album(item))
        elif result_type == "playlist":
            groups["playlists"].append(_normalize_search_playlist(item))
    return groups


class YTMusicService:
    """Cached, failure-safe access to YouTube Music discovery endpoints."""

    def __init__(self, timeout: int = settings.YT_MUSIC_TIMEOUT_SECONDS) -> None:
        self._timeout = timeout
        self._client_instance: YTMusic | None = None

    def _client(self) -> YTMusic:
        if self._client_instance is None:
            session = requests.Session()
            session.request = functools.partial(  # type: ignore[method-assign]
                session.request, timeout=self._timeout
            )
            self._client_instance = YTMusic(requests_session=session)
        return self._client_instance

    def search_songs(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        """Individual tracks matching ``query`` (filtered to songs)."""
        key = f"ytmusic:search:{query.strip().casefold()}"
        value, _ = cache_get_or_set(
            key,
            settings.YT_MUSIC_TTL_SECONDS,
            lambda: self._search_songs(query, limit),
        )
        return value

    def _search_songs(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        try:
            results = self._client().search(
                query, filter="songs", limit=limit
            )
        except Exception:
            logger.warning("YTMusic search failed for %r", query, exc_info=True)
            return []
        return _normalize_tracks(results)

    def search_all(self, query: str, limit: int = 30) -> dict[str, Any]:
        """One YTMusic search partitioned into music-app style groups.

        Returns ``{top_result, artists, songs, albums, playlists, videos,
        cached}``. Empty (falsy) payloads are not cached so a later retry can
        pick up results.
        """
        key = f"ytmusic:search-all:{query.strip().casefold()}"
        value, served_from_cache = cache_get_or_set(
            key,
            settings.YT_MUSIC_TTL_SECONDS,
            lambda: self._search_all(query, limit),
        )
        return {
            "top_result": None,
            "artists": [],
            "songs": [],
            "albums": [],
            "playlists": [],
            "videos": [],
            "cached": served_from_cache,
            **(value or {}),
        }

    def _search_all(self, query: str, limit: int = 30) -> dict[str, Any] | None:
        try:
            results = self._client().search(query, limit=limit)
        except Exception:
            logger.warning("YTMusic grouped search failed for %r", query, exc_info=True)
            return None
        return _partition_search_results(results)

    def search_suggestions(self, query: str, limit: int = 10) -> list[str]:
        """Query completions for the search box."""
        key = f"ytmusic:suggestions:{query.strip().casefold()}"
        value, _ = cache_get_or_set(
            key,
            settings.YT_MUSIC_TTL_SECONDS,
            lambda: self._search_suggestions(query, limit),
            cache_falsy=True,
        )
        return value or []

    def _search_suggestions(self, query: str, limit: int = 10) -> list[str]:
        try:
            suggestions = self._client().get_search_suggestions(query)
        except Exception:
            logger.warning(
                "YTMusic search suggestions failed for %r", query, exc_info=True
            )
            return []
        if not isinstance(suggestions, list):
            return []
        cleaned = [str(s) for s in suggestions if isinstance(s, str) and s.strip()]
        return cleaned[:limit]

    def related_songs(self, video_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """Songs YouTube Music suggests for ``video_id`` (excluding it)."""
        key = f"ytmusic:related:{video_id}"
        value, _ = cache_get_or_set(
            key,
            settings.YT_MUSIC_TTL_SECONDS,
            lambda: self._related_songs(video_id, limit),
        )
        return value

    def _related_songs(self, video_id: str, limit: int = 10) -> list[dict[str, Any]]:
        try:
            data = self._client().get_watch_playlist(videoId=video_id, limit=limit)
        except Exception:
            logger.warning(
                "YTMusic related songs failed for %s", video_id, exc_info=True
            )
            return []
        tracks = data.get("tracks") or []
        songs = _normalize_tracks(tracks)
        return [song for song in songs if song["id"] != video_id]

    def explore(self) -> dict[str, Any]:
        """Latest browse payload (top songs, new releases, mood categories)."""
        value, _ = cache_get_or_set(
            "ytmusic:explore",
            settings.YT_MUSIC_TTL_SECONDS,
            self._load_explore,
            cache_falsy=False,
        )
        return value or {}

    def _load_explore(self) -> dict[str, Any] | None:
        try:
            return self._client().get_explore()
        except Exception:
            logger.warning("YTMusic explore failed", exc_info=True)
            return None

    def top_songs(self, limit: int = 10) -> list[dict[str, Any]]:
        """Trending top songs from the explore payload."""
        items = (self.explore().get("top_songs") or {}).get("items") or []
        return _normalize_tracks(items[:limit])

    def new_releases_albums(self, limit: int = 3) -> list[dict[str, Any]]:
        """Recently released albums, each with a playable audio playlist id."""
        albums: list[dict[str, Any]] = []
        for album in (self.explore().get("new_releases") or [])[:limit]:
            if not isinstance(album, dict) or not album.get("audioPlaylistId"):
                continue
            artists = album.get("artists") or []
            albums.append(
                {
                    "audio_playlist_id": album.get("audioPlaylistId"),
                    "browse_id": album.get("browseId"),
                    "title": album.get("title") or "Untitled",
                    "artists": [a.get("name") for a in artists if a.get("name")],
                    "thumbnail": _pick_thumbnail(album.get("thumbnails")),
                }
            )
        return albums

    def album_songs(
        self, audio_playlist_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Tracks of an album's audio playlist (new releases play fine)."""
        key = f"ytmusic:playlist:{audio_playlist_id}"
        value, _ = cache_get_or_set(
            key,
            settings.YT_MUSIC_TTL_SECONDS,
            lambda: self._playlist_songs(audio_playlist_id, limit),
        )
        return value

    def playlist_songs(self, playlist_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """Tracks of a regular (non-album) playlist."""
        return self.album_songs(playlist_id, limit=limit)

    def browse_album_songs(
        self, browse_id: str, limit: int = 30
    ) -> list[dict[str, Any]]:
        """Tracks of an album fetched via its browse id."""
        key = f"ytmusic:album:{browse_id}"
        value, _ = cache_get_or_set(
            key,
            settings.YT_MUSIC_TTL_SECONDS,
            lambda: self._browse_album_songs(browse_id, limit),
        )
        return value

    def _browse_album_songs(
        self, browse_id: str, limit: int = 30
    ) -> list[dict[str, Any]]:
        try:
            data = self._client().get_album(browse_id)
        except Exception:
            logger.warning("YTMusic album failed for %s", browse_id, exc_info=True)
            return []
        return _normalize_tracks(data.get("tracks") or [])[:limit]

    def _playlist_songs(
        self, playlist_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        try:
            data = self._client().get_playlist(playlist_id, limit=limit)
        except Exception:
            logger.warning(
                "YTMusic playlist failed for %s", playlist_id, exc_info=True
            )
            return []
        return _normalize_tracks(data.get("tracks") or [])

    def mood_catalog(self) -> list[dict[str, Any]]:
        """Curated YTMusic mood/genre playlists, flattened and cached."""
        value, _ = cache_get_or_set(
            "ytmusic:mood-catalog",
            settings.YT_MUSIC_TTL_SECONDS,
            self._load_mood_catalog,
            cache_falsy=True,
        )
        return value or []

    def _load_mood_catalog(self) -> list[dict[str, Any]] | None:
        try:
            raw_categories: Any = self._client().get_mood_categories() or {}
            sections: dict[str, Any] = (
                raw_categories if isinstance(raw_categories, dict) else {}
            )
        except Exception:
            logger.warning("YTMusic mood categories failed", exc_info=True)
            return None

        categories: list[dict[str, Any]] = []
        for section, items in sections.items():
            for item in items or []:
                if isinstance(item, dict):
                    categories.append({"category": section, **item})
            if len(categories) >= settings.YT_MUSIC_CATALOG_CATEGORY_LIMIT:
                break

        playlists: list[dict[str, Any]] = []
        seen: set[str] = set()
        for category in categories[: settings.YT_MUSIC_CATALOG_CATEGORY_LIMIT]:
            params = category.get("params")
            if not params:
                continue
            try:
                results = cast(
                    "list[dict[str, Any]]",
                    self._client().get_mood_playlists(params) or [],
                )
            except Exception:
                logger.warning("YTMusic mood category %r failed", category.get("title"), exc_info=True)
                continue
            for pl in results:
                playlist_id = pl.get("playlistId")
                if not playlist_id or playlist_id in seen:
                    continue
                seen.add(playlist_id)
                playlists.append(
                    {
                        "playlistId": playlist_id,
                        "title": pl.get("title") or "Untitled",
                        "thumbnail": _pick_thumbnail(pl.get("thumbnails")),
                        "category": category.get("category"),
                    }
                )
        return playlists

    def curated_mood_playlists(self, limit: int = 3) -> list[dict[str, Any]]:
        """A handful of curated playlists for the Discover page."""
        return self.mood_catalog()[:limit]

    def find_mood_playlist(self, mood: dict[str, Any]) -> dict[str, Any] | None:
        """Pick a curated YTMusic playlist that matches a mood definition."""
        keywords = [str(mood.get("label", "")).lower()]
        keywords += [str(g).lower() for g in mood.get("genres", [])]
        keywords = [k for k in keywords if k]
        for playlist in self.mood_catalog():
            title = (playlist.get("title") or "").lower()
            if any(keyword in title for keyword in keywords):
                return playlist
        return None

    def artist_albums(
        self, channel_id: str, limit: int = 12
    ) -> list[dict[str, Any]]:
        """Albums and singles from an artist channel, most recent first.

        Uses the artist overview's ``albums``/``singles`` sections, then fills
        in release dates and playable playlist ids from each album's page so
        the release feed can sort by recency and play. Cached per channel.
        """
        key = f"ytmusic:artist-albums:{channel_id}"
        value, _ = cache_get_or_set(
            key,
            settings.NOTIFICATIONS_ARTIST_REFRESH_TTL_SECONDS,
            lambda: self._artist_albums(channel_id, limit),
        )
        return value

    def _artist_albums(
        self, channel_id: str, limit: int = 12
    ) -> list[dict[str, Any]]:
        try:
            info = self._client().get_artist(channel_id)
        except Exception:
            logger.warning(
                "YTMusic artist overview failed for %s", channel_id, exc_info=True
            )
            return []

        releases: list[dict[str, Any]] = []
        seen: set[str] = set()
        for section in ("albums", "singles"):
            items = (info.get(section) or {}).get("results") or []
            for item in items:
                browse_id = item.get("browseId") if isinstance(item, dict) else None
                if not browse_id or browse_id in seen:
                    continue
                seen.add(browse_id)
                releases.append(self._artist_album_detail(browse_id, item))
                if len(releases) >= limit:
                    return releases
        return releases

    def _artist_album_detail(
        self, browse_id: str, item: dict[str, Any]
    ) -> dict[str, Any]:
        """Album overview row enriched with the album page's release date."""
        album = {
            "browse_id": browse_id,
            "release_type": "album",
            "title": item.get("title") or "Untitled",
            "cover_image_url": _pick_thumbnail(item.get("thumbnails")),
            "year": item.get("year"),
            "release_date": None,
            "audio_playlist_id": None,
        }
        try:
            detail = self._client().get_album(browse_id)
        except Exception:
            logger.warning(
                "YTMusic album detail failed for %s", browse_id, exc_info=True
            )
            return album

        if detail.get("tracks") and "videoId" in detail["tracks"][0]:
            album["release_type"] = "album"
        else:
            album["release_type"] = "single"
        if not album["cover_image_url"]:
            album["cover_image_url"] = _pick_thumbnail(detail.get("thumbnails"))
        if not album["year"]:
            album["year"] = detail.get("year")
        release_date = detail.get("releaseDate")
        album["release_date"] = _parse_release_date(release_date)
        album["audio_playlist_id"] = detail.get("audioPlaylistId")
        return album


ytmusic_service = YTMusicService()
