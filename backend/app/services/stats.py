from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.song import SongModel
from app.db.models.user_stats import UserStatsModel
from app.services.genres import GenreService


class StatsService:
    """Per-user listening stats, computed from history and cached in user_stats."""

    @staticmethod
    def get_stats(db: Session, *, user_id: str, force: bool = False) -> dict[str, Any]:
        snapshot = (
            db.query(UserStatsModel).filter(UserStatsModel.user_id == user_id).first()
        )
        if (
            not force
            and snapshot is not None
            and snapshot.last_calculated_at is not None
        ):
            last = snapshot.last_calculated_at
            if last.tzinfo:
                last = last.replace(tzinfo=None)
            age = (datetime.now(UTC).replace(tzinfo=None) - last).total_seconds()
            if age < settings.STATS_CACHE_TTL_SECONDS:
                return {
                    "total_plays": snapshot.total_plays,
                    "total_play_time": snapshot.total_play_time,
                    "plays_last_30_days": snapshot.plays_last_30_days or [],
                    "top_songs": snapshot.top_songs or [],
                    "top_artists": snapshot.top_artists or [],
                    "genres": snapshot.genres or [],
                    "cached": True,
                }

        return StatsService.recalculate(db, user_id=user_id)

    @staticmethod
    def get_top_artists(
        db: Session, *, user_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        artists = StatsService.get_stats(db, user_id=user_id)["top_artists"]
        return cast("list[dict[str, Any]]", artists)[:limit]

    @staticmethod
    def get_top_songs(
        db: Session, *, user_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        songs = StatsService.get_stats(db, user_id=user_id)["top_songs"]
        return cast("list[dict[str, Any]]", songs)[:limit]

    @staticmethod
    def get_genres(
        db: Session, *, user_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        genres = StatsService.get_stats(db, user_id=user_id)["genres"]
        return cast("list[dict[str, Any]]", genres)[:limit]

    @staticmethod
    def recalculate(db: Session, *, user_id: str) -> dict[str, Any]:
        entries = (
            db.query(ListeningHistoryModel)
            .filter(ListeningHistoryModel.user_id == user_id)
            .all()
        )
        song_ids = [e.song_id for e in entries if e.song_id]
        songs = {
            s.id: s
            for s in db.query(SongModel).filter(SongModel.id.in_(song_ids)).all()
        }

        total_plays = len(entries)
        total_play_time = sum(e.play_duration or 0 for e in entries)

        since = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=30)
        daily_counts: Counter[str] = Counter()
        for entry in entries:
            played_at = entry.played_at
            if played_at and played_at.tzinfo:
                played_at = played_at.replace(tzinfo=None)
            if played_at and played_at >= since:
                daily_counts[played_at.date().isoformat()] += 1
        plays_last_30_days = [
            {"date": day, "plays": count} for day, count in sorted(daily_counts.items())
        ]

        song_plays: Counter[str] = Counter()
        for entry in entries:
            if entry.song_id:
                song_plays[entry.song_id] += 1
        top_songs = []
        for song_id, count in song_plays.most_common():
            song = songs.get(song_id)
            if song is None:
                continue
            top_songs.append(
                {
                    "count": count,
                    "song": {
                        "id": song.id,
                        "title": song.title,
                        "uploader": song.uploader,
                        "thumbnail": song.thumbnail,
                        "duration": song.duration,
                    },
                }
            )

        artist_plays: Counter[str] = Counter()
        for entry in entries:
            song = songs.get(entry.song_id or "")
            if song is None:
                continue
            names = [artist.name for artist in song.artists]
            if not names and song.uploader:
                names = [song.uploader]
            for name in names:
                artist_plays[name] += 1
        top_artists = [
            {"name": name, "plays": count}
            for name, count in artist_plays.most_common()
        ]

        # Genres are resolved once per artist (not per play) and only for the
        # most-played artists, so MusicBrainz lookups stay cheap and cached.
        genres_by_artist: dict[str, list[str]] = {}
        for name, _plays in artist_plays.most_common(settings.STATS_GENRES_MAX_ARTISTS):
            genres_by_artist[name] = GenreService.resolve_artist_genres(db, name)
        genre_plays: Counter[str] = Counter()
        for name, plays in artist_plays.items():
            for genre in genres_by_artist.get(name, []):
                genre_plays[genre] += plays
        genres = [
            {"name": name, "plays": count} for name, count in genre_plays.most_common()
        ]

        result = {
            "total_plays": total_plays,
            "total_play_time": total_play_time,
            "plays_last_30_days": plays_last_30_days,
            "top_songs": top_songs,
            "top_artists": top_artists,
            "genres": genres,
            "cached": False,
        }

        StatsService._store_snapshot(db, user_id=user_id, data=result)
        return result

    @staticmethod
    def _store_snapshot(db: Session, *, user_id: str, data: dict[str, Any]) -> None:
        snapshot = (
            db.query(UserStatsModel).filter(UserStatsModel.user_id == user_id).first()
        )
        now = datetime.now(UTC)
        if snapshot is None:
            snapshot = UserStatsModel(
                user_id=user_id,
                total_plays=data["total_plays"],
                total_play_time=data["total_play_time"],
                top_songs=data["top_songs"],
                top_artists=data["top_artists"],
                genres=data["genres"],
                plays_last_30_days=data["plays_last_30_days"],
                last_calculated_at=now,
            )
            db.add(snapshot)
        else:
            snapshot.total_plays = data["total_plays"]
            snapshot.total_play_time = data["total_play_time"]
            snapshot.top_songs = data["top_songs"]
            snapshot.top_artists = data["top_artists"]
            snapshot.genres = data["genres"]
            snapshot.plays_last_30_days = data["plays_last_30_days"]
            snapshot.last_calculated_at = now
        db.commit()
