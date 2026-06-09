from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class PlaybackStateModel(BaseModel):
    # Manual override because singular name is preferred for this table
    _override_tablename = "playback_state"

    last_song_id: Mapped[str | None] = mapped_column(String, nullable=True)
    # List of song IDs
    current_queue: Mapped[list[str]] = mapped_column(JSON, default=list)
    # List of song IDs
    recent_songs: Mapped[list[str]] = mapped_column(JSON, default=list)
    last_playlist_id: Mapped[str | None] = mapped_column(String, nullable=True)
