from typing import Any

from fastapi import APIRouter, HTTPException, Response

from app.services.youtube import youtube_service

router = APIRouter()


@router.get("/")
def search(q: str, response: Response) -> list[dict[str, Any]]:
    try:
        songs, served_from_cache = youtube_service.search_songs(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None
    if served_from_cache:
        response.headers["X-Cache-Status"] = "HIT"
    return songs
