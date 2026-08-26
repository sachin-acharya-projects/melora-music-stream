"""Album library: favoriting and detail lookups for YouTube Music albums."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.album import AlbumModel
from app.services.ytmusic import ytmusic_service


class AlbumService:
    """Save albums to a user's library and serve their metadata + tracks."""

    @staticmethod
    def favorite(
        db: Session,
        *,
        user_id: str,
        browse_id: str,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Add an album to the user's favorites, creating the album row if new."""
        album = (
            db.query(AlbumModel)
            .filter(AlbumModel.browse_id == browse_id)
            .first()
        )
        if album is None:
            album = AlbumModel(browse_id=browse_id)
            db.add(album)

        if payload:
            album.title = payload.get("title") or album.title
            album.artist_name = payload.get("artist_name") or album.artist_name
            if payload.get("year"):
                album.year = int(payload["year"])
            if payload.get("thumbnail_url"):
                album.thumbnail_url = payload["thumbnail_url"]
            if payload.get("audio_playlist_id"):
                album.audio_playlist_id = payload["audio_playlist_id"]
        if not album.title:
            album.title = "Untitled"

        # Flush so the generated id is available for the favorites link.
        db.flush()

        from app.db.models.associations import album_favorites

        already = db.execute(
            select(album_favorites).where(
                album_favorites.c.user_id == user_id,
                album_favorites.c.album_id == album.id,
            )
        ).first()
        if already is None:
            db.execute(
                album_favorites.insert().values(
                    user_id=user_id,
                    album_id=album.id,
                    created_at=datetime.now(UTC),
                )
            )
        db.commit()
        db.refresh(album)
        return album

    @staticmethod
    def unfavorite(db: Session, *, user_id: str, browse_id: str) -> bool:
        album = (
            db.query(AlbumModel)
            .filter(AlbumModel.browse_id == browse_id)
            .first()
        )
        if album is None:
            return False
        from app.db.models.associations import album_favorites

        deleted = db.execute(
            album_favorites.delete().where(
                album_favorites.c.user_id == user_id,
                album_favorites.c.album_id == album.id,
            )
        )
        db.commit()
        return deleted.rowcount > 0

    @staticmethod
    def list_favorites(db: Session, *, user_id: str) -> list[dict[str, Any]]:
        from app.db.models.associations import album_favorites

        rows = (
            db.query(
                AlbumModel,
                album_favorites.c.created_at.label("favorited_at"),
            )
            .join(
                album_favorites,
                AlbumModel.id == album_favorites.c.album_id,
            )
            .filter(album_favorites.c.user_id == user_id)
            .order_by(album_favorites.c.created_at.desc())
            .all()
        )
        return [
            {
                "album": row.AlbumModel,
                "favorited_at": row.favorited_at.isoformat(),
            }
            for row in rows
        ]

    @staticmethod
    def get_detail(
        db: Session, *, user_id: str | None, browse_id: str
    ) -> dict[str, Any] | None:
        album = (
            db.query(AlbumModel)
            .filter(AlbumModel.browse_id == browse_id)
            .first()
        )
        if album is None:
            return None

        tracks: list[dict[str, Any]] = []
        try:
            if album.audio_playlist_id:
                tracks = ytmusic_service.playlist_songs(album.audio_playlist_id, limit=50)
            if not tracks:
                tracks = ytmusic_service.browse_album_songs(browse_id, limit=50)
        except Exception:
            tracks = []

        is_favorite = False
        if user_id is not None:
            from app.db.models.associations import album_favorites

            hit = db.execute(
                select(album_favorites.c.album_id).where(
                    album_favorites.c.user_id == user_id,
                    album_favorites.c.album_id == album.id,
                )
            ).first()
            is_favorite = hit is not None

        return {
            "album": album,
            "tracks": tracks,
            "is_favorite": is_favorite,
        }


album_service = AlbumService()
