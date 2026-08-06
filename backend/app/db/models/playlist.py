from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import playlist_follows, playlist_song
from app.db.models.song import SongModel

if TYPE_CHECKING:
    from app.db.models.playlist_share import PlaylistShareModel
    from app.db.models.user import UserModel


class PlaylistVisibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"


class CollaboratorRole(StrEnum):
    VIEWER = "viewer"
    EDITOR = "editor"


class PlaylistCollaboratorModel(BaseModel):
    _override_tablename = "playlist_collaborators"

    playlist_id: Mapped[str] = mapped_column(
        String, ForeignKey("playlists.id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, default=CollaboratorRole.EDITOR)
    __table_args__ = (UniqueConstraint("playlist_id", "user_id"),)

    playlist: Mapped[PlaylistModel] = relationship(
        "PlaylistModel", back_populates="collaborators"
    )
    user: Mapped[UserModel] = relationship("UserModel", lazy="selectin")


class PlaylistModel(BaseModel):
    name: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )
    visibility: Mapped[str] = mapped_column(
        String, default=PlaylistVisibility.PRIVATE, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    follower_count: Mapped[int] = mapped_column(default=0)
    is_collaborative: Mapped[bool] = mapped_column(Boolean, default=False)

    songs: Mapped[list[SongModel]] = relationship(
        "SongModel",
        secondary=playlist_song,
        back_populates="playlists",
        order_by=SongModel.created_at,
    )

    followers: Mapped[list[UserModel]] = relationship(
        "UserModel",
        secondary=playlist_follows,
        back_populates="followed_playlists",
        lazy="selectin",
    )

    collaborators: Mapped[list[PlaylistCollaboratorModel]] = relationship(
        "PlaylistCollaboratorModel",
        back_populates="playlist",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    owner: Mapped[UserModel | None] = relationship(
        "UserModel",
        back_populates="playlists",
        lazy="selectin",
    )

    share: Mapped[PlaylistShareModel | None] = relationship(
        "PlaylistShareModel",
        back_populates="playlist",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
