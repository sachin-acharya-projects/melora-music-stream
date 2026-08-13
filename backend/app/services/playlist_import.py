from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.messages import Messages
from app.db.models.playlist import PlaylistModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel
from app.schemas.song import PlaylistImport, Song
from app.services.playlists import PlaylistService
from app.services.youtube import youtube_service


class PlaylistImportService:
    """Import playlists from YouTube into a Melora playlist."""

    @staticmethod
    def import_playlist(
        db: Session, data: PlaylistImport, user: UserModel
    ) -> dict[str, Any]:
        """Import a playlist from YouTube. Raises HTTPException on failure."""
        db_playlist = PlaylistImportService._get_or_create_playlist_for_import(
            db, data, user
        )
        db_playlist.source_url = data.url
        db.flush()

        songs_data = youtube_service.extract_playlist_info(data.url)
        # De-duplicate by video id (YouTube playlists may repeat videos) and skip
        # malformed entries that failed to resolve an id.
        songs_by_id: dict[str, Song] = {}
        for s_data in songs_data:
            song_id = s_data.get("id")
            if not song_id:
                continue
            songs_by_id[song_id] = Song(
                id=song_id,
                title=s_data["title"],
                uploader=s_data["uploader"],
                thumbnail=s_data["thumbnail"],
                duration=s_data["duration"],
            )

        current_song_ids = {str(s.id) for s in db_playlist.songs}
        new_songs = [
            song
            for song_id, song in songs_by_id.items()
            if song_id not in current_song_ids
        ]

        if new_songs:
            existing_songs = {
                song.id: song
                for song in db.query(SongModel)
                .filter(SongModel.id.in_(list(songs_by_id)))
                .all()
            }
            for song in new_songs:
                db_song = existing_songs.get(song.id)
                if db_song is None:
                    db_song = SongModel(
                        id=song.id,
                        title=song.title,
                        uploader=song.uploader,
                        thumbnail=song.thumbnail,
                        duration=song.duration,
                    )
                    db.add(db_song)
                    existing_songs[song.id] = db_song
                PlaylistService.append_song(db, db_playlist, db_song)
            db.commit()

        return {
            "message": "Imported",
            "count": len(new_songs),
            "playlist_id": db_playlist.id,
        }

    @staticmethod
    def sync_playlist(db: Session, *, playlist_id: str, user: UserModel) -> dict[str, Any]:
        """Re-import from a playlist's stored source URL, adding new songs."""
        db_playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.id == playlist_id).first()
        )
        if db_playlist is None:
            raise HTTPException(status_code=404, detail=Messages.PLAYLIST_NOT_FOUND)

        PlaylistImportService._ensure_owner(db_playlist, user)

        if not db_playlist.source_url:
            raise HTTPException(
                status_code=400, detail=Messages.PLAYLIST_SOURCE_URL_NOT_SET
            )

        return PlaylistImportService.import_playlist(
            db,
            PlaylistImport(url=db_playlist.source_url, id=playlist_id),
            user,
        )

    @staticmethod
    def _get_or_create_playlist_for_import(
        db: Session, data: PlaylistImport, user: UserModel
    ) -> PlaylistModel:
        """Get or create a playlist for import. Owner or admin for existing. Raises HTTPException on failure."""
        if data.id:
            db_playlist = (
                db.query(PlaylistModel).filter(PlaylistModel.id == data.id).first()
            )
            if db_playlist is None:
                raise HTTPException(
                    status_code=404, detail=Messages.PLAYLIST_NOT_FOUND_BY_ID
                )
            PlaylistImportService._ensure_owner(db_playlist, user)
            return db_playlist

        if data.name:
            db_playlist = (
                db.query(PlaylistModel).filter(PlaylistModel.name == data.name).first()
            )
            if db_playlist is None:
                db_playlist = PlaylistModel(name=data.name, user_id=user.id)
                db.add(db_playlist)
                db.commit()
                db.refresh(db_playlist)
            else:
                PlaylistImportService._ensure_owner(db_playlist, user)
            return db_playlist

        raise HTTPException(
            status_code=400, detail=Messages.PLAYLIST_ID_OR_NAME_REQUIRED
        )

    @staticmethod
    def _ensure_owner(playlist: PlaylistModel, user: UserModel) -> None:
        """Ensure a user is the playlist owner, an admin, or an editor collaborator."""
        if user.role == "admin":
            return
        is_editor = playlist.is_collaborative and any(
            c.user_id == user.id and c.role == "editor" for c in playlist.collaborators
        )
        if playlist.user_id is None or (playlist.user_id != user.id and not is_editor):
            raise HTTPException(
                status_code=403,
                detail=Messages.NO_PERMISSION_TO_MODIFY_PLAYLIST,
            )
