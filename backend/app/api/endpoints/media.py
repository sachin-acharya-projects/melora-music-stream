from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.thumbnail import CACHE_CONTROL, thumbnail_service
from app.services.youtube import youtube_service

router = APIRouter()


@router.get("/stream/{video_id}")
def stream(video_id: str) -> dict[str, Any]:
    try:
        return youtube_service.get_stream_info(video_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None


@router.get("/download/{video_id}")
def download(video_id: str) -> FileResponse:
    try:
        result = youtube_service.download_song(video_id)
        return FileResponse(
            result["filename"],
            filename=f"{result['title']}.mp3",
            media_type="audio/mpeg",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None


@router.get("/thumbnail")
def thumbnail(url: str) -> FileResponse:
    """Proxy a Google-hosted image through the backend with a disk cache.

    The frontend used to load artwork directly from Google's CDN, which
    rate-limits (HTTP 429) under burst load. Serving through this endpoint
    keeps the browser requests local and makes Google see only one request per
    unique image, cached immutably on disk.
    """
    try:
        result = thumbnail_service.resolve(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    if result is None:
        raise HTTPException(status_code=502, detail="Could not fetch thumbnail")
    path, content_type = result
    return FileResponse(
        path,
        media_type=content_type,
        headers={"Cache-Control": CACHE_CONTROL},
    )
