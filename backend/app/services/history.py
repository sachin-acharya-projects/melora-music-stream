from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.messages import Messages
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.song import SongModel
from app.schemas.history import HistoryRecordCreate
from app.services.artist import ArtistService
from app.services.songs import SongService
from app.services.stats import StatsService


class HistoryService:
    """Listening history recording and aggregation."""

    @staticmethod
    def record_listen(
        db: Session, *, user_id: str, data: HistoryRecordCreate
    ) -> dict[str, Any]:
        db_song = SongService.upsert_song(db, data.song)

        entry = ListeningHistoryModel(
            user_id=user_id,
            song_id=db_song.id,
            played_at=data.played_at or datetime.now(UTC),
            play_duration=data.play_duration,
            context_playlist_id=data.context_playlist_id,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        ArtistService.register_artist_if_threshold_reached(
            db, song=db_song, user_id=user_id
        )

        return HistoryService._serialize_entry(db, entry)

    @staticmethod
    def update_play_duration(
        db: Session, *, entry_id: str, user_id: str, play_duration: int | None
    ) -> dict[str, Any]:
        entry = (
            db.query(ListeningHistoryModel)
            .filter(
                ListeningHistoryModel.id == entry_id,
                ListeningHistoryModel.user_id == user_id,
            )
            .first()
        )
        if entry is None:
            raise HTTPException(status_code=404, detail=Messages.HISTORY_ENTRY_NOT_FOUND)
        entry.play_duration = play_duration
        db.commit()
        db.refresh(entry)
        return HistoryService._serialize_entry(db, entry)

    @staticmethod
    def get_history(
        db: Session,
        *,
        user_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        base = db.query(ListeningHistoryModel).filter(
            ListeningHistoryModel.user_id == user_id
        )
        total = base.count()
        entries = (
            base.order_by(ListeningHistoryModel.played_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "items": [HistoryService._serialize_entry(db, entry) for entry in entries],
        }

    @staticmethod
    def _deduped_rows(
        db: Session, *, user_id: str
    ) -> list[tuple[str, str, datetime]]:
        """History rows (id, song_id, played_at), newest first, one per song.

        A song replayed several times appears once, at its most recent play.
        """
        rows = (
            db.query(
                ListeningHistoryModel.id,
                ListeningHistoryModel.song_id,
                ListeningHistoryModel.played_at,
            )
            .filter(ListeningHistoryModel.user_id == user_id)
            .order_by(ListeningHistoryModel.played_at.desc())
            .all()
        )
        deduped: list[tuple[str, str, datetime]] = []
        seen: set[str] = set()
        for entry_id, song_id, played_at in rows:
            if song_id is None or song_id in seen:
                continue
            seen.add(song_id)
            deduped.append((entry_id, song_id, played_at))
        return deduped

    @staticmethod
    def _serialize_rows(
        db: Session, rows: list[tuple[str, str, datetime]]
    ) -> list[dict[str, Any]]:
        if not rows:
            return []
        songs_by_id = {
            song.id: song
            for song in db.query(SongModel)
            .filter(SongModel.id.in_([song_id for _, song_id, _ in rows]))
            .all()
        }
        return [
            {
                "id": entry_id,
                "played_at": played_at.isoformat() if played_at else None,
                "play_duration": None,
                "context_playlist_id": None,
                "song": {
                    "id": song.id if song else song_id,
                    "title": song.title if song else None,
                    "uploader": song.uploader if song else None,
                    "thumbnail": song.thumbnail if song else None,
                    "duration": song.duration if song else None,
                }
                if (song := songs_by_id.get(song_id))
                else None,
            }
            for entry_id, song_id, played_at in rows
        ]

    @staticmethod
    def get_recent(
        db: Session, *, user_id: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        rows = HistoryService._deduped_rows(db, user_id=user_id)[:limit]
        return HistoryService._serialize_rows(db, rows)

    @staticmethod
    def get_recently_played(
        db: Session,
        *,
        user_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        rows = HistoryService._deduped_rows(db, user_id=user_id)
        total = len(rows)
        start = (page - 1) * page_size
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": HistoryService._serialize_rows(db, rows[start : start + page_size]),
        }

    @staticmethod
    def get_stats(db: Session, *, user_id: str) -> dict[str, Any]:
        return StatsService.get_stats(db, user_id=user_id)

    @staticmethod
    def _serialize_entry(db: Session, entry: ListeningHistoryModel) -> dict[str, Any]:
        song = (
            db.query(SongModel).filter(SongModel.id == entry.song_id).first()
            if entry.song_id
            else None
        )
        return {
            "id": entry.id,
            "played_at": entry.played_at.isoformat() if entry.played_at else None,
            "play_duration": entry.play_duration,
            "context_playlist_id": entry.context_playlist_id,
            "song": {
                "id": song.id if song else entry.song_id,
                "title": song.title if song else None,
                "uploader": song.uploader if song else None,
                "thumbnail": song.thumbnail if song else None,
                "duration": song.duration if song else None,
            }
            if song
            else None,
        }
