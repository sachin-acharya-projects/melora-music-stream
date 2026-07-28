from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import playlist_song
from app.db.models.song import SongModel

if TYPE_CHECKING:
    from app.db.models.user import UserModel


class PlaylistModel(BaseModel):
    name: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, index=True
    )

    songs: Mapped[list["SongModel"]] = relationship(
        "SongModel",
        secondary=playlist_song,
        back_populates="playlists",
        order_by=SongModel.created_at,
    )

    owner: Mapped["UserModel | None"] = relationship(
        "UserModel",
        back_populates="playlists",
        lazy="selectin",
    )
