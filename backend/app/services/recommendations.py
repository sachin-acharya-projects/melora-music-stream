"""History-based song suggestions and seed-based radio generation.

Recommendations read the per-user stats snapshot (top artists / top songs /
genres) plus followed artists, then pull fresh songs through the cached
YouTube search service, preferring YTMusic's song-filtered results when they
are available. Radio generation seeds from a genre, artist, or mood and
assembles a shuffled batch of songs, excluding songs the user recently played;
mood radio is enriched with a curated YTMusic mood playlist.

Assembled batches are cached in-process for a short TTL; the underlying
YouTube searches are already cached for 24 hours, so polling the radio near
the end of the queue stays cheap.
"""

from __future__ import annotations

import random
import time
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException
from sqlalchemy import func

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.messages import Messages
from app.core.moods import MOODS
from app.db.models.artist import ArtistModel
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.user import UserModel
from app.services.artist import ArtistService
from app.services.songs import SongService
from app.services.stats import StatsService
from app.services.youtube import youtube_service
from app.services.ytmusic import ytmusic_service

RADIO_DEFAULT_COUNT = 25
RADIO_MAX_COUNT = 50
RECOMMENDATIONS_DEFAULT_LIMIT = 20
RECOMMENDATIONS_MAX_LIMIT = 50

_REC_TTL_SECONDS = 30 * 60
_rec_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}


class RecommendationsService:
    """Recommendation and radio generation."""

    @staticmethod
    def get_moods() -> list[dict[str, Any]]:
        return MOODS

    @staticmethod
    def get_genres() -> list[dict[str, Any]]:
        """Global genre picker built from YTMusic's curated mood/genre catalog.

        Each genre groups a few playlists so the UI can preview (and seed)
        it independently of the user's listening history.
        """
        playlists = ytmusic_service.mood_catalog()
        by_name: dict[str, dict[str, Any]] = {}
        for playlist in playlists:
            name = (playlist.get("title") or "").strip()
            if not name or not playlist.get("playlistId"):
                continue
            entry = by_name.setdefault(name.casefold(), {"name": name, "playlists": []})
            entry["playlists"].append(
                {
                    "id": playlist.get("playlistId"),
                    "title": playlist.get("title") or "Untitled",
                    "thumbnail": playlist.get("thumbnail") or "",
                }
            )
        genres = [entry for entry in by_name.values() if entry["playlists"]]
        for entry in genres:
            entry["playlists"] = entry["playlists"][:4]
        genres.sort(key=lambda entry: entry["name"].casefold())
        return genres

    @staticmethod
    def get_user_seeds(db: Session, user: UserModel) -> dict[str, Any]:
        """Genres and artists the UI can offer as radio seeds.

        Explicit ``favorite_genres`` come first, followed by genres inferred
        from listening history (deduplicated case-insensitively).
        """
        explicit = [g for g in (user.favorite_genres or []) if isinstance(g, str)]
        listened = [
            entry["name"] for entry in StatsService.get_genres(db, user_id=user.id, limit=8)
        ]
        merged: list[str] = []
        seen: set[str] = set()
        for raw in [*explicit, *listened]:
            key = raw.strip().lower()
            if key and key not in seen:
                seen.add(key)
                merged.append(raw.strip())
        return {
            "genres": merged,
            "top_artists": StatsService.get_top_artists(db, user_id=user.id, limit=6),
        }

    @staticmethod
    def get_for_user(
        db: Session, *, user_id: str, limit: int
    ) -> list[dict[str, Any]]:
        """Suggest songs based on listening history and followed artists."""
        cache_key = f"rec:user:{user_id}"
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached[:limit]

        seen = _recent_played_ids(db, user_id, limit=200)
        stats = StatsService.get_stats(db, user_id=user_id)

        songs: list[dict[str, Any]] = []
        for name in _user_suggestion_seeds(db, user_id, stats):
            for song in _search_track_songs(name):
                if _track_unseen(song, seen):
                    songs.append(song)
            if len(songs) >= limit * 3:
                break

        for song_id in _top_song_ids(stats, count=3):
            for related in SongService.get_related_songs(db, song_id, limit=6):
                if _track_unseen(related, seen):
                    songs.append(related)

        random.shuffle(songs)
        result = songs[:limit]
        _set_cached(cache_key, result)
        return result

    @staticmethod
    def get_radio_songs(
        db: Session,
        *,
        user_id: str,
        seed_type: str,
        seed_value: str,
        count: int,
    ) -> dict[str, Any]:
        """Generate a shuffled batch of songs from a genre/artist/mood seed."""
        seed_type = seed_type.strip().lower()
        seed_value = seed_value.strip()
        cache_key = f"radio:{user_id}:{seed_type}:{seed_value.lower()}"
        cached = _get_cached(cache_key)
        if cached is not None:
            return _radio_response(seed_type, seed_value, cached[:count])

        seen = _recent_played_ids(db, user_id, limit=100)
        candidates: list[dict[str, Any]] = []

        if seed_type == "mood":
            mood = next((m for m in MOODS if m["id"] == seed_value.lower()), None)
            if mood is None:
                raise HTTPException(status_code=400, detail=Messages.MOOD_NOT_FOUND)
            for genre in mood["genres"]:
                _collect_genre_songs(db, genre, candidates, seen)
            _enrich_mood_playlist(mood, candidates, seen)
        elif seed_type == "genre":
            for genre in _split_genre_seed(seed_value):
                _collect_genre_songs(db, genre, candidates, seen)
                _enrich_genre_playlists(genre, candidates, seen)
        elif seed_type == "artist":
            artist = _resolve_artist(db, seed_value)
            if artist is not None:
                for song in _search_track_songs(artist.name):
                    if song["id"] not in seen:
                        seen.add(song["id"])
                        candidates.append(song)
        else:
            raise HTTPException(status_code=400, detail=Messages.INVALID_SEED_TYPE)

        random.shuffle(candidates)
        result = candidates[:count]
        _set_cached(cache_key, result)
        return _radio_response(seed_type, seed_value, result)


def _radio_response(
    seed_type: str, seed_value: str, songs: list[dict[str, Any]]
) -> dict[str, Any]:
    return {
        "seed_type": seed_type,
        "seed_value": seed_value,
        "count": len(songs),
        "songs": songs,
    }


def _user_suggestion_seeds(
    db: Session, user_id: str, stats: dict[str, Any]
) -> list[str]:
    """Seed artist names: top listened artists plus a couple followed artists."""
    seeds: list[str] = []
    for entry in stats.get("top_artists", [])[:3]:
        name = entry.get("name")
        if name and name not in seeds:
            seeds.append(name)

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user is not None:
        for artist in ArtistService.get_following_artists(db, user)[:2]:
            name = artist.get("name")
            if name and name not in seeds:
                seeds.append(name)
    return seeds


def _top_song_ids(stats: dict[str, Any], *, count: int) -> list[str]:
    """Ids of the user's most-played songs."""
    song_ids: list[str] = []
    for entry in stats.get("top_songs", [])[:count]:
        song = entry.get("song") or {}
        song_id = song.get("id")
        if song_id:
            song_ids.append(song_id)
    return song_ids


def _track_unseen(song: dict[str, Any], seen: set[str]) -> bool:
    """Add ``song`` to ``seen``; return True if it wasn't already there."""
    if song["id"] not in seen:
        seen.add(song["id"])
        return True
    return False


def _search_songs(query: str) -> list[dict[str, Any]]:
    """Run a cached YouTube search and return just the songs."""
    return youtube_service.search_songs(query)[0]


def _search_track_songs(query: str) -> list[dict[str, Any]]:
    """Prefer YTMusic song-filtered results; fall back to generic YouTube search."""
    songs = ytmusic_service.search_songs(query)
    return songs if songs else _search_songs(query)


def _recent_played_ids(
    db: Session, user_id: str, *, limit: int
) -> set[str]:
    rows = (
        db.query(ListeningHistoryModel.song_id)
        .filter(ListeningHistoryModel.user_id == user_id)
        .order_by(ListeningHistoryModel.played_at.desc())
        .limit(limit)
        .all()
    )
    return {row[0] for row in rows if row[0]}


def _resolve_artist(db: Session, seed_value: str) -> ArtistModel | None:
    """Resolve an artist by slug, id, or case-insensitive name."""
    artist = (
        db.query(ArtistModel)
        .filter(ArtistModel.slug == seed_value, ArtistModel.is_published.is_(True))
        .first()
        or db.query(ArtistModel)
        .filter(ArtistModel.id == seed_value, ArtistModel.is_published.is_(True))
        .first()
    )
    if artist is None:
        artist = (
            db.query(ArtistModel)
            .filter(
                func.lower(ArtistModel.name) == seed_value.lower(),
                ArtistModel.is_published.is_(True),
            )
            .first()
        )
    return artist


def _artists_for_genre(
    db: Session, genre: str, *, limit: int = settings.ARTIST_SUGGESTIONS_TOP_ARTISTS
) -> list[ArtistModel]:
    """Popular artists whose enriched genres contain ``genre``."""
    target = genre.strip().lower()
    if not target:
        return []
    artists = (
        db.query(ArtistModel)
        .filter(
            ArtistModel.genres.isnot(None),
            ArtistModel.is_published.is_(True),
        )
        .order_by(ArtistModel.follower_count.desc())
        .limit(200)
        .all()
    )
    matches: list[ArtistModel] = []
    for artist in artists:
        for value in artist.genres or []:
            if isinstance(value, str) and value.strip().lower() == target:
                matches.append(artist)
                break
        if len(matches) >= limit:
            break
    return matches


def _collect_genre_songs(
    db: Session,
    genre: str,
    candidates: list[dict[str, Any]],
    seen: set[str],
) -> None:
    """Append songs matching ``genre`` (artist-first, direct search fallback)."""
    artists = _artists_for_genre(db, genre)
    for artist in artists:
        for song in _search_track_songs(artist.name):
            if song["id"] not in seen:
                seen.add(song["id"])
                candidates.append(song)

    if not artists:
        for song in _search_track_songs(f"{genre} songs"):
            if song["id"] not in seen:
                seen.add(song["id"])
                candidates.append(song)


def _split_genre_seed(seed_value: str) -> list[str]:
    """Split a (possibly comma-separated) genre seed into unique genres."""
    genres: list[str] = []
    seen: set[str] = set()
    for part in seed_value.split(","):
        genre = part.strip()
        key = genre.casefold()
        if key and key not in seen:
            seen.add(key)
            genres.append(genre)
    return genres


def _enrich_genre_playlists(
    genre: str,
    candidates: list[dict[str, Any]],
    seen: set[str],
) -> None:
    """Append tracks from curated YTMusic playlists matching ``genre``."""
    target = genre.strip().casefold()
    if not target:
        return
    matched = 0
    for playlist in ytmusic_service.mood_catalog():
        title = (playlist.get("title") or "").casefold()
        if not title or target not in title:
            continue
        for song in ytmusic_service.playlist_songs(playlist["playlistId"], limit=10):
            if song["id"] not in seen:
                seen.add(song["id"])
                candidates.append(song)
        matched += 1
        if matched >= 2:
            break


def _enrich_mood_playlist(
    mood: dict[str, Any],
    candidates: list[dict[str, Any]],
    seen: set[str],
) -> None:
    """Append tracks from a matching curated YTMusic mood playlist."""
    playlist = ytmusic_service.find_mood_playlist(mood)
    if playlist is None:
        return
    for song in ytmusic_service.playlist_songs(playlist["playlistId"], limit=10):
        if song["id"] not in seen:
            seen.add(song["id"])
            candidates.append(song)


def _get_cached(key: str) -> list[dict[str, Any]] | None:
    item = _rec_cache.get(key)
    if item is None:
        return None
    created_at, value = item
    if time.monotonic() - created_at > _REC_TTL_SECONDS:
        _rec_cache.pop(key, None)
        return None
    return value


def _set_cached(key: str, value: list[dict[str, Any]]) -> None:
    _rec_cache[key] = (time.monotonic(), value)
