from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.youtube import youtube_service

router = APIRouter()


@router.get("/")
def search(q: str) -> list[dict[str, Any]]:
    try:
        return youtube_service.search_songs(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None
