from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class SearchHistoryModel(BaseModel):
    """A user's distinct search query with the last time it was searched.

    One row per (user, query); re-searching bumps ``searched_at`` so the
    recent-searches UI can order entries by recency.
    """

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    query: Mapped[str] = mapped_column(String)
    searched_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )

    __table_args__ = (
        UniqueConstraint("user_id", "query", name="uq_search_history_user_query"),
    )
