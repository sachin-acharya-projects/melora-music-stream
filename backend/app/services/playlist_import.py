from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel
from app.db.models.song import SongModel
from app.schemas.song import PlaylistImport, Song
from app.services.songs import SongService
from app.services.youtube import youtube_service


class PlaylistImportService:
    """Import playlists from YouTube into a Melora playlist."""

    @staticmethod
    def import_playlist(db: Session, data: PlaylistImport) -> dict[str, Any]:
        """Import a playlist from YouTube. Raises HTTPException on failure."""
        db_playlist = PlaylistImportService._get_or_create_playlist_for_import(db, data)

        songs_data = youtube_service.extract_playlist_info(data.url)
        songs = [
            Song(
                id=s_data["id"],
                title=s_data["title"],
                uploader=s_data["uploader"],
                thumbnail=s_data["thumbnail"],
                duration=s_data["duration"],
            )
            for s_data in songs_data
        ]

        current_song_ids = {str(s.id) for s in db_playlist.songs}
        new_songs = [s for s in songs if s.id not in current_song_ids]
        added_count = len(new_songs)

        if new_songs:
            for s in new_songs:
                SongService.upsert_song(db, s)
                db_song = db.query(SongModel).filter(SongModel.id == s.id).first()
                if db_song:
                    db_playlist.songs.append(db_song)
            db.commit()

        return {
            "message": "Imported",
            "count": added_count,
            "playlist_id": db_playlist.id,
        }

    @staticmethod
    def _get_or_create_playlist_for_import(
        db: Session, data: PlaylistImport
    ) -> PlaylistModel:
        """Get or create a playlist for import. Raises HTTPException on failure."""
        if data.id:
            db_playlist = (
                db.query(PlaylistModel).filter(PlaylistModel.id == data.id).first()
            )
            if db_playlist is None:
                raise HTTPException(
                    status_code=404, detail="Playlist with provided ID not found"
                )
            return db_playlist

        if data.name:
            db_playlist = (
                db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
            )
            if db_playlist is None:
                db_playlist = PlaylistModel(name=data.name)
                db.add(db_playlist)
                db.commit()
                db.refresh(db_playlist)
            return db_playlist

        raise HTTPException(
            status_code=400, detail="Either playlist 'id' or 'name' must be provided"
        )
