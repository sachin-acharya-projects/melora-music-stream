from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.schemas.lyrics import LyricsResponse
from app.services.lyrics import lyrics_service
from app.services.songs import SongService
from app.services.ytmusic import ytmusic_service

router = APIRouter()


@router.get("/{song_id}/related")
def get_related_songs(
    song_id: str,
    db: SessionDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 6,
) -> list[dict[str, Any]]:
    """Songs similar to ``song_id``.

    Prefers songs from the same uploader already in the library; when those
    don't fill ``limit``, tops up with YouTube Music's own suggestions.
    """
    related = SongService.get_related_songs(db, song_id, limit=limit)
    if len(related) >= limit:
        return related

    yt_songs = ytmusic_service.related_songs(song_id, limit=limit)
    seen = {song["id"] for song in related}
    for song in yt_songs:
        if len(related) >= limit:
            break
        if song.get("id") and song["id"] not in seen:
            related.append(song)
            seen.add(song["id"])
    return related


@router.get("/{song_id}/lyrics")
def get_song_lyrics(song_id: str, db: SessionDep) -> LyricsResponse:
    return lyrics_service.get_lyrics_for_song(db, song_id)
