from datetime import datetime

from pydantic import BaseModel

from app.schemas.song import Song


class HistoryRecordCreate(BaseModel):
    song: Song
    played_at: datetime | None = None
    play_duration: int | None = None
    context_playlist_id: str | None = None


class HistoryUpdate(BaseModel):
    play_duration: int | None = None
