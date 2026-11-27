from __future__ import annotations

from datetime import datetime  # noqa: TC003 - runtime-evaluated by SQLAlchemy
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, JSON, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import song_artist, user_artist_follows

if TYPE_CHECKING:
    from app.db.models.artist_identity import ArtistIdentityModel\n    from app.db.models.release import ReleaseModel
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
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    enriched_at: Mapped[datetime | None] = mapped_column(nullable=True)\n    entity_type: Mapped[str] = mapped_column(String, default="unknown", index=True)\n    identity_status: Mapped[str] = mapped_column(String, default="unverified", index=True)\n    identity_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)\n    identity_source: Mapped[str | None] = mapped_column(String, nullable=True)

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

    identities: Mapped[list[ArtistIdentityModel]] = relationship(\n        "ArtistIdentityModel",\n        back_populates="artist",\n        cascade="all, delete-orphan",\n        lazy="selectin",\n    )\n\n    releases: Mapped[list[ReleaseModel]] = relationship(
        "ReleaseModel",
        back_populates="artist",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
