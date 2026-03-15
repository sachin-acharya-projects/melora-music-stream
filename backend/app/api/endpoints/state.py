from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import PlaybackStateModel
from app.schemas.song import PlaybackState

router = APIRouter()


@router.get("/")
def get_playback_state(db: Session = Depends(get_db)):
    state = db.query(PlaybackStateModel).first()
    if state is None:
        return {
            "last_song_id": None,
            "current_queue": [],
            "recent_songs": [],
            "last_playlist_id": None,
        }
    return {
        "last_song_id": state.last_song_id,
        "current_queue": state.current_queue,
        "recent_songs": state.recent_songs,
        "last_playlist_id": state.last_playlist_id,
    }


@router.post("/")
def update_playback_state(data: PlaybackState, db: Session = Depends(get_db)):
    state = db.query(PlaybackStateModel).first()
    if state is None:
        state = PlaybackStateModel(
            last_song_id=data.last_song_id,
            current_queue=data.current_queue,
            recent_songs=data.recent_songs,
            last_playlist_id=data.last_playlist_id,
        )
        db.add(state)
    else:
        state.last_song_id = data.last_song_id  # type: ignore
        state.current_queue = data.current_queue  # type: ignore
        state.recent_songs = data.recent_songs  # type: ignore
        state.last_playlist_id = data.last_playlist_id  # type: ignore

    db.commit()
    return {"message": "Playback state updated"}
