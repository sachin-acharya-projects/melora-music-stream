from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.playlist import PlaylistModel


class PlaylistShareModel(BaseModel):
    """Revocable, token-based share link for a playlist."""

    playlist_id: Mapped[str] = mapped_column(
        String, ForeignKey("playlists.id"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)

    playlist: Mapped["PlaylistModel"] = relationship(back_populates="share")
