from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.models.associations import playlist_song
from app.db.models.song import SongModel


class PlaylistModel(BaseModel):
    name: Mapped[str] = mapped_column(unique=True, index=True)

    songs: Mapped[list["SongModel"]] = relationship(
        "SongModel",
        secondary=playlist_song,
        back_populates="playlists",
        order_by=SongModel.created_at,
    )
