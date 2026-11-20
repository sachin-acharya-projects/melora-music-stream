from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class PlaylistPreferencesModel(BaseModel):
    """Per-user display preferences for an individual playlist."""

    _override_tablename = "playlist_preferences"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    playlist_id: Mapped[str] = mapped_column(
        String, ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False
    )
    sort_by: Mapped[str] = mapped_column(String, default="position")
    sort_order: Mapped[str] = mapped_column(String, default="asc")
    is_paginated: Mapped[bool] = mapped_column(Boolean, default=True)
    view_mode: Mapped[str] = mapped_column(String, default="grid")

    __table_args__ = (UniqueConstraint("user_id", "playlist_id"),)
