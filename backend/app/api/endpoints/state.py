from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.api.deps import SessionDep
from app.api.deps.auth import require_user_or_scopes
from app.db.models.user import UserModel
from app.schemas.song import PlaybackState
from app.services.playback import PlaybackService

router = APIRouter()
PlaybackReadUser = Annotated[UserModel, Depends(require_user_or_scopes("player:read"))]
PlaybackControlUser = Annotated[UserModel, Depends(require_user_or_scopes("player:control"))]


@router.get("/")
def get_playback_state(db: SessionDep, current_user: PlaybackReadUser) -> dict[str, Any]:
    return PlaybackService.get_playback_state(db, user_id=current_user.id)


@router.post("/")
def update_playback_state(
    data: PlaybackState, db: SessionDep, current_user: PlaybackControlUser
) -> dict[str, str]:
    PlaybackService.upsert_playback_state(db, user_id=current_user.id, data=data)
    return {"message": "Playback state updated"}
