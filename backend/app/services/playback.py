from typing import Any

from sqlalchemy.orm import Session

from app.db.models.playback_state import PlaybackStateModel
from app.db.models.song import SongModel
from app.schemas.song import PlaybackState, Song


class PlaybackService:
    """Playback state service."""

    @staticmethod
    def get_playback_state(db: Session, *, user_id: str) -> dict[str, Any]:
        """Get the playback state for a user."""
        state = (
            db.query(PlaybackStateModel)
            .filter(PlaybackStateModel.user_id == user_id)
            .first()
        )
        if state is None:
            return {
                "last_song_id": None,
                "current_queue": [],
                "recent_songs": [],
                "last_playlist_id": None,
            }

        queue_songs = PlaybackService._resolve_song_ids(db, state.current_queue)
        recent_songs = PlaybackService._resolve_song_ids(db, state.recent_songs)

        return {
            "last_song_id": state.last_song_id,
            "current_queue": queue_songs,
            "recent_songs": recent_songs,
            "last_playlist_id": state.last_playlist_id,
        }

    @staticmethod
    def upsert_playback_state(
        db: Session, *, user_id: str, data: PlaybackState
    ) -> None:
        """Upsert the playback state for a user."""
        # The same song can appear in both the queue and recent songs (or twice
        # in a queue). De-duplicate by id up front: upserting a duplicate in the
        # same session would insert two rows for one primary key.
        seen: set[str] = set()
        all_songs = [
            song
            for song in data.current_queue + data.recent_songs
            if not (song.id in seen or seen.add(song.id))
        ]
        for song in all_songs:
            PlaybackService._upsert_song_if_needed(db, song)
        db.commit()

        queue_ids = [s.id for s in data.current_queue]
        recent_ids = [s.id for s in data.recent_songs]

        state = (
            db.query(PlaybackStateModel)
            .filter(PlaybackStateModel.user_id == user_id)
            .first()
        )
        if state is None:
            state = PlaybackStateModel(
                user_id=user_id,
                last_song_id=data.last_song_id,
                current_queue=queue_ids,
                recent_songs=recent_ids,
                last_playlist_id=data.last_playlist_id,
            )
            db.add(state)
        else:
            state.last_song_id = data.last_song_id
            state.current_queue = queue_ids
            state.recent_songs = recent_ids
            state.last_playlist_id = data.last_playlist_id

        db.commit()

    @staticmethod
    def _resolve_song_ids(db: Session, song_ids: list[str]) -> list[dict[str, Any]]:
        """Resolve a list of song IDs to full song dicts."""
        if not song_ids:
            return []

        songs = db.query(SongModel).filter(SongModel.id.in_(song_ids)).all()
        songs_map = {s.id: s for s in songs}

        return [
            {
                "id": s_id,
                "title": songs_map[s_id].title,
                "uploader": songs_map[s_id].uploader,
                "thumbnail": songs_map[s_id].thumbnail,
                "duration": songs_map[s_id].duration,
                "created_at": songs_map[s_id].created_at.isoformat()
                if songs_map[s_id].created_at
                else None,
            }
            for s_id in song_ids
            if s_id in songs_map
        ]

    @staticmethod
    def _upsert_song_if_needed(db: Session, song: Song) -> None:
        """Create a song record if it doesn't already exist.

        Note: artists are intentionally not synced here. Playing from a search
        queue must not register every channel that merely appears in results.
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
