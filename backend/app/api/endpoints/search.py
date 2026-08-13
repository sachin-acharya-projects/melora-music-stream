from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Response

from app.services.youtube import youtube_service
from app.services.ytmusic import ytmusic_service

router = APIRouter()

_GROUP_KEYS = ("artists", "songs", "albums", "playlists", "videos")


@router.get("/")
def search(
    q: Annotated[str, Query(min_length=1, max_length=200)],
    response: Response,
) -> dict[str, Any]:
    """Grouped search results from YTMusic, falling back to plain YouTube."""
    results = ytmusic_service.search_all(q)
    if not _has_any_results(results):
        results = _fallback_search(q)
    if results.get("cached"):
        response.headers["X-Cache-Status"] = "HIT"
    return results


@router.get("/suggestions")
def suggestions(
    q: Annotated[str, Query(min_length=1, max_length=200)],
) -> list[str]:
    """Query completions for the search box."""
    return ytmusic_service.search_suggestions(q)


@router.get("/tracks")
def search_tracks(
    playlist_id: Annotated[str, Query(min_length=1, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=50)] = 30,
) -> list[dict[str, Any]]:
    """Tracks for an album or playlist search result.

    ``playlist_id`` may be an audio playlist id or an album browse id; both
    are tried so every album/playlist row can be played.
    """
    try:
        songs = ytmusic_service.playlist_songs(playlist_id, limit=limit)
        if not songs:
            songs = ytmusic_service.browse_album_songs(playlist_id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None
    return songs


def _has_any_results(results: dict[str, Any]) -> bool:
    return results.get("top_result") is not None or any(results.get(key) for key in _GROUP_KEYS)


def _fallback_search(q: str) -> dict[str, Any]:
    """Flat song results from generic YouTube search when YTMusic is empty."""
    try:
        songs, served_from_cache = youtube_service.search_songs(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None
    return {
        "top_result": None,
        "artists": [],
        "songs": songs,
        "albums": [],
        "playlists": [],
        "videos": [],
        "cached": served_from_cache,
    }
