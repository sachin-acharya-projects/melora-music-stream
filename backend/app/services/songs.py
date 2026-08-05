from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.song import SongModel
from app.schemas.song import Song


class SongService:
    """Song persistence, serialization, and lookups."""

    @staticmethod
    def serialize(song: SongModel) -> dict[str, Any]:
        """Serialize a song model to the API response shape."""
        return {
            "id": song.id,
            "title": song.title,
            "uploader": song.uploader,
            "thumbnail": song.thumbnail,
            "duration": song.duration,
            "created_at": song.created_at.isoformat()
            if song.created_at is not None
            else None,
        }

    @staticmethod
    def upsert_song(db: Session, song: Song) -> SongModel:
        """Idempotently create or get a song."""
        db_song = db.query(SongModel).filter(SongModel.id == song.id).first()
        if db_song is None:
            db_song = SongModel(
                id=song.id,
                title=song.title,
                uploader=song.uploader,
                thumbnail=song.thumbnail,
                duration=song.duration,
            )
            db.add(db_song)
            db.commit()
            db.refresh(db_song)
        return db_song

    @staticmethod
    def get_related_songs(
        db: Session, song_id: str, *, limit: int = 6
    ) -> list[dict[str, Any]]:
        """Return other songs from the same uploader, most recently added first."""
        current = db.query(SongModel).filter(SongModel.id == song_id).first()
        if current is None or not current.uploader:
            return []

        related = (
            db.query(SongModel)
            .filter(
                func.lower(SongModel.uploader) == current.uploader.lower(),
                SongModel.id != song_id,
            )
            .order_by(SongModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return [SongService.serialize(song) for song in related]
