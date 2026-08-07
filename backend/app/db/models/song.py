from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import playlist_song, song_artist

if TYPE_CHECKING:
    from app.db.models.artist import ArtistModel
    from app.db.models.listening_history import ListeningHistoryModel
    from app.db.models.playlist import PlaylistModel


class SongModel(BaseModel):
    # Override id to remove the default UUID generation, as we use YouTube IDs
    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)

    title: Mapped[str | None] = mapped_column(String, nullable=True)
    uploader: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[int | None] = mapped_column(nullable=True)

    playlists: Mapped[list[PlaylistModel]] = relationship(
        "PlaylistModel",
        secondary=playlist_song,
        back_populates="songs",
    )

    artists: Mapped[list[ArtistModel]] = relationship(
        "ArtistModel",
        secondary=song_artist,
        back_populates="songs",
        lazy="selectin",
    )

    listening_history: Mapped[list[ListeningHistoryModel]] = relationship(
        "ListeningHistoryModel",
        back_populates="song",
        lazy="selectin",
    )
