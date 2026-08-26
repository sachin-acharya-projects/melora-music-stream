from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class AlbumModel(BaseModel):
    """A YouTube Music album saved (favorited) by at least one user.

    Materialized from YTMusic data at favorite-time so the library survives
    upstream changes; ``browse_id`` is the stable YT identifier and
    ``audio_playlist_id`` is what playback uses.
    """

    browse_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    audio_playlist_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    artist_name: Mapped[str | None] = mapped_column(String, nullable=True)
    artist_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("artists.id", ondelete="SET NULL"),
        nullable=True,
    )
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("browse_id", name="uq_albums_browse_id"),)
