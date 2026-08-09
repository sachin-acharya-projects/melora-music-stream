from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import user_artist_follows

if TYPE_CHECKING:
    from app.db.models.artist import ArtistModel
    from app.db.models.listening_history import ListeningHistoryModel
    from app.db.models.playlist import PlaylistCollaboratorModel, PlaylistModel
    from app.db.models.user_stats import UserStatsModel


class UserRole(StrEnum):
    ADMIN = "admin"
    USER = "user"


class UserModel(BaseModel):
    _override_tablename = "users"

    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default=UserRole.USER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    oauth_provider: Mapped[str | None] = mapped_column(String, nullable=True)
    oauth_id: Mapped[str | None] = mapped_column(String, nullable=True)
    favorite_genres: Mapped[list[str]] = mapped_column(JSON, default=list)
    privacy_settings: Mapped[dict[str, bool]] = mapped_column(
        JSON,
        default=lambda: {"profile_public": True, "listening_history_visible": False},
    )
    notification_settings: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default=lambda: {
            "new_release": {
                "in_app": True,
                "email": False,
                "push": False,
            }
        },
    )

    playlists: Mapped[list[PlaylistModel]] = relationship(
        "PlaylistModel",
        back_populates="owner",
        lazy="selectin",
    )

    followed_playlists: Mapped[list[PlaylistModel]] = relationship(
        "PlaylistModel",
        secondary="playlist_follows",
        back_populates="followers",
        lazy="selectin",
    )

    collaborations: Mapped[list[PlaylistCollaboratorModel]] = relationship(
        "PlaylistCollaboratorModel",
        lazy="selectin",
        overlaps="user",
    )

    followed_artists: Mapped[list[ArtistModel]] = relationship(
        "ArtistModel",
        secondary=user_artist_follows,
        back_populates="followers",
        lazy="selectin",
    )

    listening_history: Mapped[list[ListeningHistoryModel]] = relationship(
        "ListeningHistoryModel",
        back_populates="user",
        order_by="ListeningHistoryModel.played_at.desc()",
        lazy="selectin",
    )

    stats: Mapped[UserStatsModel | None] = relationship(
        "UserStatsModel",
        back_populates="user",
        lazy="selectin",
    )
