from typing import Any

from fastapi import APIRouter

from app.services.discover import DiscoverService

router = APIRouter()


@router.get("/")
def get_discover_feed() -> dict[str, Any]:
    """Global discovery feed: trending songs, new releases, and mood playlists."""
    return DiscoverService.get_feed()
