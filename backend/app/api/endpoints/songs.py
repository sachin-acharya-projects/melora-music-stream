from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.schemas.lyrics import LyricsResponse
from app.services.lyrics import lyrics_service
from app.services.songs import SongService

router = APIRouter()


@router.get("/{song_id}/related")
def get_related_songs(
    song_id: str,
    db: SessionDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 6,
) -> list[dict[str, Any]]:
    return SongService.get_related_songs(db, song_id, limit=limit)


@router.get("/{song_id}/lyrics")
def get_song_lyrics(song_id: str, db: SessionDep) -> LyricsResponse:
    return lyrics_service.get_lyrics_for_song(db, song_id)
