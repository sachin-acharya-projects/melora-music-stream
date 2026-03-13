from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.youtube import youtube_service

router = APIRouter()


@router.get("/stream/{video_id}")
def stream(video_id: str):
    try:
        return youtube_service.get_stream_info(video_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None


@router.get("/download/{video_id}")
def download(video_id: str):
    try:
        result = youtube_service.download_song(video_id)
        return FileResponse(result["filename"], filename=f"{result['title']}.mp3", media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None
