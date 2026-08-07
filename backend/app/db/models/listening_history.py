from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.song import SongModel
    from app.db.models.user import UserModel


class ListeningHistoryModel(BaseModel):
    _override_tablename = "listening_history"

    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )
    song_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("songs.id"), nullable=True, index=True
    )
    played_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    play_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    context_playlist_id: Mapped[str | None] = mapped_column(String, nullable=True)

    user: Mapped[UserModel | None] = relationship(
        "UserModel",
        back_populates="listening_history",
    )

    song: Mapped[SongModel | None] = relationship(
        "SongModel",
        back_populates="listening_history",
    )
