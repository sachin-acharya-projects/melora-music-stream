from typing import Any

from fastapi import HTTPException
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session, contains_eager

from app.db.models.playlist import PlaylistModel
from app.db.models.song import SongModel
from app.schemas.song import Song
from app.services.songs import SongService


class PlaylistService:
    """Playlist CRUD operations."""

    @staticmethod
    def get_all_playlists(
        db: Session,
        *,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> list[dict[str, Any]]:
        """Get all playlists with their songs."""
        sort_col = getattr(SongModel, sort_by, "title")
        order_func = asc if order == "asc" else desc

        playlists = (
            db.query(PlaylistModel)
            .outerjoin(PlaylistModel.songs)
            .options(contains_eager(PlaylistModel.songs))
            .order_by(PlaylistModel.id, order_func(sort_col))
            .all()
        )

        return [
            {
                "id": p.id,
                "name": p.name,
                "created_at": p.created_at.isoformat()
                if p.created_at is not None
                else None,
                "songs": [SongService.serialize(song) for song in p.songs],
            }
            for p in playlists
        ]

    @staticmethod
    def get_playlist_by_id(
        db: Session,
        playlist_id: str,
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
            "id": db_playlist.id,
            "name": db_playlist.name,
            "created_at": db_playlist.created_at.isoformat()
            if db_playlist.created_at is not None
            else None,
            "total": total,
            "total_songs": total_songs,
            "total_duration": total_duration,
            "songs": [SongService.serialize(song) for song in songs],
        }

    @staticmethod
    def create_playlist(db: Session, *, name: str) -> dict[str, Any]:
        """Create a new playlist. Idempotent: returns existing if name matches."""
        db_playlist = db.query(PlaylistModel).filter(PlaylistModel.name == name).first()
        if db_playlist is not None:
            return {
                "message": "Playlist already exists",
                "id": db_playlist.id,
                "name": db_playlist.name,
            }

        new_playlist = PlaylistModel(name=name)
        db.add(new_playlist)
        db.commit()
        db.refresh(new_playlist)
        return {
            "message": "Playlist created",
            "id": new_playlist.id,
            "name": new_playlist.name,
        }

    @staticmethod
    def update_playlist_name(
        db: Session, *, playlist_id: str, new_name: str
    ) -> dict[str, Any]:
        """Update a playlist's name. Raises HTTPException on failure."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        existing = (
            db.query(PlaylistModel).filter(PlaylistModel.name == new_name).first()
        )
        if existing is not None and existing.id != playlist_id:
            raise HTTPException(status_code=400, detail="Playlist name already exists")

        db_playlist.name = new_name
        db.commit()
        return {
            "message": "Playlist updated",
            "id": db_playlist.id,
            "name": db_playlist.name,
        }

    @staticmethod
    def delete_playlist(db: Session, *, playlist_id: str) -> dict[str, str]:
        """Delete a playlist. Raises HTTPException if not found."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        db.delete(db_playlist)
        db.commit()
        return {"message": "Playlist deleted"}

    @staticmethod
    def add_song_to_playlist(
        db: Session, *, playlist_id_or_name: str, song: Song
    ) -> dict[str, Any]:
        """Add a song to a playlist. Creates the playlist if it doesn't exist."""
        db_playlist = PlaylistService._resolve_playlist(db, playlist_id_or_name)
        db_song = SongService.upsert_song(db, song)

        song_ids = [str(s.id) for s in db_playlist.songs]
        if str(db_song.id) not in song_ids:
            db_playlist.songs.append(db_song)
            db.commit()
            return {"message": "Song added", "playlist_id": db_playlist.id}

        return {"message": "Song already in playlist", "playlist_id": db_playlist.id}

    @staticmethod
    def add_songs_bulk_to_playlist(
        db: Session, *, playlist_id_or_name: str, songs: list[Song]
    ) -> dict[str, Any]:
        """Add multiple songs to a playlist. Creates the playlist if it doesn't exist."""
        db_playlist = PlaylistService._resolve_playlist(db, playlist_id_or_name)

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
        db: Session, *, playlist_id: str, song_id: str
    ) -> dict[str, str]:
        """Remove a song from a playlist. Raises HTTPException on failure."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail="Playlist not found")

        db_song = db.query(SongModel).filter(SongModel.id == song_id).first()
        if db_song is None or str(db_song.id) not in [
            str(s.id) for s in db_playlist.songs
        ]:
            raise HTTPException(status_code=404, detail="Song not found in playlist")

        db_playlist.songs.remove(db_song)
        db.commit()
        return {"message": "Song removed from playlist"}

    @staticmethod
    def _resolve_playlist(db: Session, playlist_id_or_name: str) -> PlaylistModel:
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
            db_playlist = PlaylistModel(name=playlist_id_or_name)
            db.add(db_playlist)
            db.commit()
            db.refresh(db_playlist)

        return db_playlist
