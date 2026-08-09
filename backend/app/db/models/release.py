from __future__ import annotations

from datetime import datetime  # noqa: TC003 - runtime-evaluated by SQLAlchemy
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.artist import ArtistModel


class ReleaseModel(BaseModel):
    """A release (album or single) from a followed artist, discovered via
    YouTube Music.

    Tracked so the app can (a) serve a per-user "new releases from artists you
    follow" feed straight from the DB and (b) diff against what each user has
    already been notified about.
    """

    artist_id: Mapped[str] = mapped_column(
        String, ForeignKey("artists.id", ondelete="CASCADE"), index=True
    )
    release_type: Mapped[str] = mapped_column(String, default="album")
    title: Mapped[str] = mapped_column(String)
    cover_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    release_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    year: Mapped[int | None] = mapped_column(nullable=True)
    browse_id: Mapped[str | None] = mapped_column(String, nullable=True)
    audio_playlist_id: Mapped[str | None] = mapped_column(String, nullable=True)

    artist: Mapped[ArtistModel] = relationship(
        "ArtistModel",
        back_populates="releases",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("artist_id", "browse_id", name="uq_release_artist_browse"),
        Index("ix_releases_date", "release_date"),
    )
