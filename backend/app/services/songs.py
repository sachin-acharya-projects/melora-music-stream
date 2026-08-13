from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
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
            "is_featured": bool(song.is_featured),
            "is_published": bool(song.is_published),
            "created_at": song.created_at.isoformat()
            if song.created_at is not None
            else None,
        }

    @staticmethod
    def upsert_song(db: Session, song: Song) -> SongModel:
        """Idempotently create or get a song.

        Artists are deliberately not created or linked here: queue sync and
        playlist adds must never register artists. Materialization happens in
        :func:`app.services.artist.ArtistService.register_artist_if_threshold_reached`
        once the play threshold is met.
        """
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

        # Refresh stale metadata: rows created from flat extraction (or before
        # durations were populated) may carry a zero duration, so heal them
        # whenever a fresher value comes through any add/play/import path.
        dirty = False
        if song.title and song.title != db_song.title:
            db_song.title = song.title
            dirty = True
        if song.uploader and song.uploader != db_song.uploader:
            db_song.uploader = song.uploader
            dirty = True
        if song.thumbnail and song.thumbnail != db_song.thumbnail:
            db_song.thumbnail = song.thumbnail
            dirty = True
        if song.duration and song.duration != db_song.duration:
            db_song.duration = song.duration
            dirty = True
        if dirty:
            db.commit()
            db.refresh(db_song)
        return db_song

    @staticmethod
    def get_related_songs(
        db: Session, song_id: str, *, limit: int = settings.SIMILAR_SONGS_LIMIT
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
                SongModel.is_published.is_(True),
            )
            .order_by(SongModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return [SongService.serialize(song) for song in related]
