from __future__ import annotations

from datetime import datetime  # noqa: TC003 - runtime-evaluated by SQLAlchemy
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import UserModel


class UserStatsModel(BaseModel):
    _override_tablename = "user_stats"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_stats_user_id"),)

    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )
    total_plays: Mapped[int] = mapped_column(Integer, default=0)
    total_play_time: Mapped[int] = mapped_column(Integer, default=0)
    top_songs: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    top_artists: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    genres: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    plays_last_30_days: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    last_calculated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[UserModel | None] = relationship(
        "UserModel",
        back_populates="stats",
    )
