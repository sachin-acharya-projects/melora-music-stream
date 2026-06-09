from typing import Any

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.db.models import PlaybackStateModel, SongModel
from app.schemas.song import PlaybackState

router = APIRouter()


@router.get("/")
def get_playback_state(db: SessionDep) -> dict[str, Any]:
    state = db.query(PlaybackStateModel).first()
    if state is None:
        return {
            "last_song_id": None,
            "current_queue": [],
            "recent_songs": [],
            "last_playlist_id": None,
        }

    # Fetch details for queue and recent songs
    queue_songs = []
    if state.current_queue:
        songs = db.query(SongModel).filter(SongModel.id.in_(state.current_queue)).all()
        songs_map = {s.id: s for s in songs}
        queue_songs = [
            {
                "id": s_id,
                "title": songs_map[s_id].title,
                "uploader": songs_map[s_id].uploader,
                "thumbnail": songs_map[s_id].thumbnail,
                "duration": songs_map[s_id].duration,
                "created_at": (
                    songs_map[s_id].created_at.isoformat()
                    if songs_map[s_id].created_at
                    else None
                ),
            }
            for s_id in state.current_queue
            if s_id in songs_map
        ]

    recent_songs = []
    if state.recent_songs:
        songs = db.query(SongModel).filter(SongModel.id.in_(state.recent_songs)).all()
        songs_map = {s.id: s for s in songs}
        recent_songs = [
            {
                "id": s_id,
                "title": songs_map[s_id].title,
                "uploader": songs_map[s_id].uploader,
                "thumbnail": songs_map[s_id].thumbnail,
                "duration": songs_map[s_id].duration,
                "created_at": (
                    songs_map[s_id].created_at.isoformat()
                    if songs_map[s_id].created_at
                    else None
                ),
            }
            for s_id in state.recent_songs
            if s_id in songs_map
        ]

    return {
        "last_song_id": state.last_song_id,
        "current_queue": queue_songs,
        "recent_songs": recent_songs,
        "last_playlist_id": state.last_playlist_id,
    }


@router.post("/")
def update_playback_state(data: PlaybackState, db: SessionDep) -> dict[str, str]:

    # 1. First, upsert all songs in current_queue and recent_songs to ensure they exist in the DB
    all_songs = data.current_queue + data.recent_songs
    for song in all_songs:
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

    # 2. Extract song IDs for storage
    queue_ids = [s.id for s in data.current_queue]
    recent_ids = [s.id for s in data.recent_songs]

    state = db.query(PlaybackStateModel).first()
    if state is None:
        state = PlaybackStateModel(
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
    return {"message": "Playback state updated"}
