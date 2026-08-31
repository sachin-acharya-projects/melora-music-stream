from typing import Any

from fastapi import APIRouter, Query

from app.services.discover import DiscoverService

router = APIRouter()


@router.get("/")
def get_discover_feed(
    top_songs_limit: int = Query(20, ge=1, le=100),
    new_releases_limit: int = Query(6, ge=1, le=100),
    mood_playlists_limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    """Global discovery feed: trending songs, new releases, and mood playlists.

    Section sizes are request-controlled so clients can ask for a small preview
    (Home) or a larger list (a dedicated browse page).
    """
    return DiscoverService.get_feed(
        top_songs_limit=top_songs_limit,
        new_releases_limit=new_releases_limit,
        mood_playlists_limit=mood_playlists_limit,
    )
