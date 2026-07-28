from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.schemas.song import PlaybackState
from app.services.playback import PlaybackService

router = APIRouter()


@router.get("/")
def get_playback_state(db: SessionDep, current_user: CurrentUser) -> dict[str, Any]:
    return PlaybackService.get_playback_state(db, user_id=current_user.id)


@router.post("/")
def update_playback_state(
    data: PlaybackState, db: SessionDep, current_user: CurrentUser
) -> dict[str, str]:
    PlaybackService.upsert_playback_state(db, user_id=current_user.id, data=data)
    return {"message": "Playback state updated"}
