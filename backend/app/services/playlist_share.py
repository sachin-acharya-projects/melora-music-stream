import secrets
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel
from app.db.models.playlist_share import PlaylistShareModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel
from app.services.songs import SongService


class PlaylistShareService:
    """Manage revocable share links for playlists."""

    @staticmethod
    def create_share_link(db: Session, *, playlist_id: str, user: UserModel) -> str:
        """Create a share token for a playlist, or return the existing one.

        Controlled sharing: only playlists with an explicit, revocable token can be
        accessed via the public share endpoint. Owner or admin only. Raises
        HTTPException if not found.
        """
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistShareService._ensure_owner(db_playlist, user)

        if db_playlist.share is not None:
            return db_playlist.share.token

        db_share = PlaylistShareModel(
            playlist_id=db_playlist.id, token=secrets.token_urlsafe(16)
        )
        db.add(db_share)
        db.commit()
        db.refresh(db_share)
        return db_share.token

    @staticmethod
    def revoke_share_link(
        db: Session, *, playlist_id: str, user: UserModel
    ) -> dict[str, str]:
        """Revoke all share tokens for a playlist. Owner or admin only. Idempotent."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistShareService._ensure_owner(db_playlist, user)

        for db_share in db.query(PlaylistShareModel).filter(
            PlaylistShareModel.playlist_id == playlist_id
        ):
            db.delete(db_share)
        db.commit()
        return {"message": "Share link revoked"}

    @staticmethod
    def get_shared_playlist(db: Session, token: str) -> dict[str, Any]:
        """Resolve a playlist by its share token. Raises HTTPException if revoked/missing."""
        db_share = (
            db.query(PlaylistShareModel)
            .filter(PlaylistShareModel.token == token)
            .first()
        )
        if db_share is None:
            raise HTTPException(
                status_code=404, detail="Playlist not found or link revoked"
            )

        db_playlist = (
            db.query(PlaylistModel)
            .filter(PlaylistModel.id == db_share.playlist_id)
            .first()
        )
        if db_playlist is None:
            raise HTTPException(
                status_code=404, detail="Playlist not found or link revoked"
            )

        songs = (
            db.query(SongModel)
            .join(PlaylistModel.songs)
            .filter(PlaylistModel.id == db_playlist.id)
            .order_by(SongModel.created_at)
            .all()
        )

        return {
            "id": db_playlist.id,
            "name": db_playlist.name,
            "created_at": db_playlist.created_at.isoformat()
            if db_playlist.created_at is not None
            else None,
            "songs": [SongService.serialize(song) for song in songs],
        }

    @staticmethod
    def _ensure_owner(playlist: PlaylistModel, user: UserModel) -> None:
        """Ensure a user is the playlist owner or an admin."""
        if user.role == "admin":
            return
        if playlist.user_id is None or playlist.user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to modify this playlist",
            )
