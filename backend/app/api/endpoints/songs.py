from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.services.songs import SongService

router = APIRouter()


@router.get("/{song_id}/related")
def get_related_songs(
    song_id: str,
    db: SessionDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 6,
) -> list[dict[str, Any]]:
    return SongService.get_related_songs(db, song_id, limit=limit)
