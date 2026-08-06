from typing import Any

from fastapi import HTTPException
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session, contains_eager

from app.db.models.playlist import (
    CollaboratorRole,
    PlaylistCollaboratorModel,
    PlaylistModel,
    PlaylistVisibility,
)
from app.db.models.song import SongModel
from app.db.models.user import UserModel
from app.schemas.song import PlaylistUpdate, Song
from app.services.songs import SongService


class PlaylistService:
    """Playlist CRUD operations."""

    @staticmethod
    def get_all_playlists(
        db: Session,
        user: UserModel,
        *,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> list[dict[str, Any]]:
        """Get the user's playlists plus public playlists from other users."""
        sort_col = getattr(PlaylistModel, sort_by, PlaylistModel.created_at)
        order_func = asc if order == "asc" else desc

        playlists = (
            db.query(PlaylistModel)
            .outerjoin(PlaylistModel.songs)
            .options(contains_eager(PlaylistModel.songs))
            .filter(
                (PlaylistModel.user_id == user.id)
                | (PlaylistModel.visibility == PlaylistVisibility.PUBLIC)
            )
            .order_by(order_func(sort_col), PlaylistModel.id, SongModel.title)
            .all()
        )

        return [
            PlaylistService._serialize(playlist, current_user_id=user.id)
            for playlist in playlists
        ]

    @staticmethod
    def get_discover_playlists(
        db: Session, user: UserModel, *, limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get public playlists ordered by popularity (follower count)."""
        playlists = (
            db.query(PlaylistModel)
            .filter(PlaylistModel.visibility == PlaylistVisibility.PUBLIC)
            .order_by(PlaylistModel.follower_count.desc(), PlaylistModel.id)
            .limit(limit)
            .all()
        )
        return [
            PlaylistService._serialize(playlist, current_user_id=user.id)
            for playlist in playlists
        ]

    @staticmethod
    def get_following_playlists(db: Session, user: UserModel) -> list[dict[str, Any]]:
        """Get the playlists a user follows."""
        playlists = (
            db.query(PlaylistModel)
            .join(PlaylistModel.followers)
            .filter(UserModel.id == user.id)
            .order_by(PlaylistModel.created_at.desc(), PlaylistModel.id)
            .all()
        )
        return [
            PlaylistService._serialize(playlist, current_user_id=user.id)
            for playlist in playlists
        ]

    @staticmethod
    def get_playlist_by_id(
        db: Session,
        playlist_id: str,
        user: UserModel | None,
        *,
        search_query: str | None = None,
        sort_by: str = "created_at",
        order: str = "desc",
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        """Get a single playlist by ID with a page of songs. Raises HTTPException if not found."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_can_view(db_playlist, user)

        songs_query = (
            db.query(SongModel)
            .join(PlaylistModel.songs)
            .filter(PlaylistModel.id == playlist_id)
        )

        if search_query:
            songs_query = songs_query.filter(
                (SongModel.title.ilike(f"%{search_query}%"))
                | (SongModel.uploader.ilike(f"%{search_query}%"))
            )

        sort_col = getattr(SongModel, sort_by)
        order_func = asc if order == "asc" else desc
        total = songs_query.count()
        songs = (
            songs_query.order_by(order_func(sort_col))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        all_songs_query = (
            db.query(SongModel)
            .join(PlaylistModel.songs)
            .filter(PlaylistModel.id == playlist_id)
        )
        total_songs = all_songs_query.count()
        total_duration = all_songs_query.with_entities(
            func.coalesce(func.sum(SongModel.duration), 0)
        ).scalar()

        return {
            **PlaylistService._serialize(
                db_playlist, current_user_id=user.id if user else None
            ),
            "total": total,
            "total_songs": total_songs,
            "total_duration": total_duration,
            "songs": [SongService.serialize(song) for song in songs],
        }

    @staticmethod
    def create_playlist(
        db: Session,
        *,
        user: UserModel,
        name: str,
        description: str | None = None,
        visibility: PlaylistVisibility = PlaylistVisibility.PRIVATE,
    ) -> dict[str, Any]:
        """Create a new playlist for a user. Idempotent per user: returns existing if name matches."""
        db_playlist = (
            db.query(PlaylistModel)
            .filter(PlaylistModel.user_id == user.id, PlaylistModel.name == name)
            .first()
        )
        if db_playlist is not None:
            return {
                "message": "Playlist already exists",
                "id": db_playlist.id,
                "name": db_playlist.name,
            }

        new_playlist = PlaylistModel(
            name=name,
            user_id=user.id,
            description=description,
            visibility=visibility,
        )
        db.add(new_playlist)
        db.commit()
        db.refresh(new_playlist)
        return {
            "message": "Playlist created",
            "id": new_playlist.id,
            "name": new_playlist.name,
        }

    @staticmethod
    def update_playlist(
        db: Session,
        *,
        playlist_id: str,
        user: UserModel,
        data: PlaylistUpdate,
    ) -> dict[str, Any]:
        """Update a playlist's name/description/visibility. Owner or admin only."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_owner(db_playlist, user)

        if data.name is not None:
            existing = (
                db.query(PlaylistModel)
                .filter(PlaylistModel.name == data.name)
                .filter(PlaylistModel.user_id == user.id)
                .first()
            )
            if existing is not None and existing.id != playlist_id:
                raise HTTPException(
                    status_code=400, detail="Playlist name already exists"
                )
            db_playlist.name = data.name
        if data.description is not None:
            db_playlist.description = data.description
        if data.visibility is not None:
            db_playlist.visibility = data.visibility
        if data.is_collaborative is not None:
            db_playlist.is_collaborative = data.is_collaborative

        db.commit()
        return {
            "message": "Playlist updated",
            "id": db_playlist.id,
            "name": db_playlist.name,
            "visibility": db_playlist.visibility,
            "description": db_playlist.description,
            "is_collaborative": db_playlist.is_collaborative,
        }

    @staticmethod
    def delete_playlist(
        db: Session, *, playlist_id: str, user: UserModel
    ) -> dict[str, str]:
        """Delete a playlist. Owner or admin only."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_owner(db_playlist, user)

        db.delete(db_playlist)
        db.commit()
        return {"message": "Playlist deleted"}

    @staticmethod
    def toggle_follow(
        db: Session, *, playlist_id: str, user: UserModel
    ) -> dict[str, Any]:
        """Follow or unfollow a playlist. Returns new state."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_can_view(db_playlist, user)

        is_following = user in db_playlist.followers
        if is_following:
            db_playlist.followers.remove(user)
            db_playlist.follower_count = max(0, (db_playlist.follower_count or 0) - 1)
        else:
            db_playlist.followers.append(user)
            db_playlist.follower_count = (db_playlist.follower_count or 0) + 1

        db.commit()
        return {
            "is_following": not is_following,
            "follower_count": db_playlist.follower_count,
        }

    @staticmethod
    def toggle_collaborative(
        db: Session, *, playlist_id: str, user: UserModel
    ) -> dict[str, Any]:
        """Enable or disable collaboration on a playlist. Owner or admin only."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_owner(db_playlist, user)

        db_playlist.is_collaborative = not db_playlist.is_collaborative
        db.commit()
        return {
            "is_collaborative": db_playlist.is_collaborative,
        }

    @staticmethod
    def get_collaborators(
        db: Session, *, playlist_id: str, user: UserModel
    ) -> list[dict[str, Any]]:
        """List a playlist's collaborators. Owner, admin, or collaborators."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_can_view(db_playlist, user)
        if not (
            PlaylistService._is_owner(db_playlist, user)
            or PlaylistService._is_editor(db_playlist, user)
        ):
            raise HTTPException(
                status_code=403, detail="Not allowed to view collaborators"
            )

        return [
            {
                "user_id": collab.user_id,
                "role": collab.role,
                "username": collab.user.username if collab.user else None,
                "display_name": collab.user.display_name if collab.user else None,
                "avatar_url": collab.user.avatar_url if collab.user else None,
            }
            for collab in db_playlist.collaborators
        ]

    @staticmethod
    def add_collaborator(
        db: Session,
        *,
        playlist_id: str,
        user_id: str,
        role: str,
        user: UserModel,
    ) -> dict[str, Any]:
        """Add a collaborator to a playlist. Owner or admin only."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_owner(db_playlist, user)

        if user_id == db_playlist.user_id:
            raise HTTPException(
                status_code=400, detail="The owner is already a collaborator"
            )

        db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if db_user is None:
            raise HTTPException(status_code=404, detail="User not found")

        existing = (
            db.query(PlaylistCollaboratorModel)
            .filter(
                PlaylistCollaboratorModel.playlist_id == playlist_id,
                PlaylistCollaboratorModel.user_id == user_id,
            )
            .first()
        )
        if existing is not None:
            existing.role = role
            db.commit()
            return {"message": "Collaborator updated", "user_id": user_id, "role": role}

        db_collab = PlaylistCollaboratorModel(
            playlist_id=playlist_id, user_id=user_id, role=role
        )
        db.add(db_collab)
        db.commit()
        return {"message": "Collaborator added", "user_id": user_id, "role": role}

    @staticmethod
    def remove_collaborator(
        db: Session, *, playlist_id: str, user_id: str, user: UserModel
    ) -> dict[str, str]:
        """Remove a collaborator from a playlist. Owner or admin only."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_owner(db_playlist, user)

        db_collab = (
            db.query(PlaylistCollaboratorModel)
            .filter(
                PlaylistCollaboratorModel.playlist_id == playlist_id,
                PlaylistCollaboratorModel.user_id == user_id,
            )
            .first()
        )
        if db_collab is None:
            raise HTTPException(status_code=404, detail="Collaborator not found")

        db.delete(db_collab)
        db.commit()
        return {"message": "Collaborator removed"}

    @staticmethod
    def add_song_to_playlist(
        db: Session,
        *,
        playlist_id_or_name: str,
        song: Song,
        user: UserModel,
    ) -> dict[str, Any]:
        """Add a song to a playlist. Creates the playlist if it doesn't exist."""
        db_playlist = PlaylistService._resolve_playlist(
            db, playlist_id_or_name, user=user
        )
        db_song = SongService.upsert_song(db, song)

        song_ids = [str(s.id) for s in db_playlist.songs]
        if str(db_song.id) not in song_ids:
            db_playlist.songs.append(db_song)
            db.commit()
            return {"message": "Song added", "playlist_id": db_playlist.id}

        return {"message": "Song already in playlist", "playlist_id": db_playlist.id}

    @staticmethod
    def add_songs_bulk_to_playlist(
        db: Session,
        *,
        playlist_id_or_name: str,
        songs: list[Song],
        user: UserModel,
    ) -> dict[str, Any]:
        """Add multiple songs to a playlist. Creates the playlist if it doesn't exist."""
        db_playlist = PlaylistService._resolve_playlist(
            db, playlist_id_or_name, user=user
        )

        added_count = 0
        current_song_ids = {str(s.id) for s in db_playlist.songs}

        for song in songs:
            db_song = SongService.upsert_song(db, song)
            if str(db_song.id) not in current_song_ids:
                db_playlist.songs.append(db_song)
                current_song_ids.add(str(db_song.id))
                added_count += 1

        db.commit()
        return {
            "message": f"{added_count} songs added",
            "playlist_id": db_playlist.id,
            "count": added_count,
        }

    @staticmethod
    def remove_song_from_playlist(
        db: Session, *, playlist_id: str, song_id: str, user: UserModel
    ) -> dict[str, str]:
        """Remove a song from a playlist. Owner, admin, or editor collaborator."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        PlaylistService._ensure_can_edit(db_playlist, user)

        db_song = db.query(SongModel).filter(SongModel.id == song_id).first()
        if db_song is None or str(db_song.id) not in [
            str(s.id) for s in db_playlist.songs
        ]:
            raise HTTPException(status_code=404, detail="Song not found in playlist")

        db_playlist.songs.remove(db_song)
        db.commit()
        return {"message": "Song removed from playlist"}

    @staticmethod
    def _resolve_playlist(
        db: Session, playlist_id_or_name: str, *, user: UserModel
    ) -> PlaylistModel:
        """Resolve a playlist by ID or name. Creates by name if not found."""
        db_playlist = (
            db.query(PlaylistModel)
            .filter(PlaylistModel.id == playlist_id_or_name)
            .first()
        )
        if db_playlist is None:
            db_playlist = (
                db.query(PlaylistModel)
                .filter(PlaylistModel.name == playlist_id_or_name)
                .first()
            )

        if db_playlist is None:
            db_playlist = PlaylistModel(name=playlist_id_or_name, user_id=user.id)
            db.add(db_playlist)
            db.commit()
            db.refresh(db_playlist)
        else:
            PlaylistService._ensure_can_edit(db_playlist, user)

        return db_playlist

    @staticmethod
    def _ensure_can_view(playlist: PlaylistModel, user: UserModel | None) -> None:
        """Ensure a user can view a playlist. Private playlists are owner/collaborator only."""
        if playlist.visibility == PlaylistVisibility.PUBLIC:
            return
        if user is not None and (
            PlaylistService._is_owner(playlist, user)
            or PlaylistService._is_collaborator(playlist, user)
        ):
            return
        raise HTTPException(status_code=404, detail="Playlist not found")

    @staticmethod
    def _ensure_owner(playlist: PlaylistModel, user: UserModel) -> None:
        """Ensure a user is the playlist owner or an admin."""
        if not PlaylistService._is_owner(playlist, user):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to modify this playlist",
            )

    @staticmethod
    def _ensure_can_edit(playlist: PlaylistModel, user: UserModel) -> None:
        """Ensure a user may modify a playlist: owner, admin, or editor collaborator."""
        if PlaylistService._is_owner(playlist, user):
            return
        if PlaylistService._is_editor(playlist, user):
            return
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to modify this playlist",
        )

    @staticmethod
    def _is_owner(playlist: PlaylistModel, user: UserModel) -> bool:
        if user.role == "admin":
            return True
        return playlist.user_id is not None and playlist.user_id == user.id

    @staticmethod
    def _is_editor(playlist: PlaylistModel, user: UserModel) -> bool:
        if not playlist.is_collaborative:
            return False
        return any(
            c.user_id == user.id and c.role == CollaboratorRole.EDITOR
            for c in playlist.collaborators
        )

    @staticmethod
    def _is_collaborator(playlist: PlaylistModel, user: UserModel) -> bool:
        if not playlist.is_collaborative:
            return False
        return any(c.user_id == user.id for c in playlist.collaborators)

    @staticmethod
    def _serialize(
        playlist: PlaylistModel, *, current_user_id: str | None
    ) -> dict[str, Any]:
        """Serialize a playlist for API responses."""
        is_owner = current_user_id is not None and playlist.user_id == current_user_id
        is_editor = is_owner or (
            current_user_id is not None
            and playlist.is_collaborative
            and any(
                c.user_id == current_user_id and c.role == CollaboratorRole.EDITOR
                for c in playlist.collaborators
            )
        )
        return {
            "id": playlist.id,
            "name": playlist.name,
            "created_at": playlist.created_at.isoformat()
            if playlist.created_at is not None
            else None,
            "visibility": playlist.visibility,
            "description": playlist.description,
            "cover_image_url": playlist.cover_image_url,
            "follower_count": playlist.follower_count or 0,
            "is_collaborative": playlist.is_collaborative or False,
            "is_owner": is_owner,
            "is_editor": is_editor,
            "is_following": current_user_id is not None
            and any(f.id == current_user_id for f in playlist.followers),
            "songs": [SongService.serialize(song) for song in playlist.songs],
        }
