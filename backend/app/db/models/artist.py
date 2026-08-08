from __future__ import annotations

from datetime import datetime  # noqa: TC003 - runtime-evaluated by SQLAlchemy
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import song_artist, user_artist_follows

if TYPE_CHECKING:
    from app.db.models.song import SongModel
    from app.db.models.user import UserModel


class ArtistModel(BaseModel):
    name: Mapped[str] = mapped_column(String, index=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    genres: Mapped[list[str]] = mapped_column(JSON, default=list)
    external_ids: Mapped[dict[str, str | None]] = mapped_column(
        JSON,
        default=lambda: {
            "youtube_channel_id": None,
            "musicbrainz_id": None,
            "lastfm_id": None,
            "spotify_id": None,
        },
    )
    channel_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    monthly_listeners: Mapped[int | None] = mapped_column(Integer, nullable=True)
    follower_count: Mapped[int] = mapped_column(default=0)
    enriched_at: Mapped[datetime | None] = mapped_column(nullable=True)

    songs: Mapped[list[SongModel]] = relationship(
        "SongModel",
        secondary=song_artist,
        back_populates="artists",
    )

    followers: Mapped[list[UserModel]] = relationship(
        "UserModel",
        secondary=user_artist_follows,
        back_populates="followed_artists",
        lazy="selectin",
    )
