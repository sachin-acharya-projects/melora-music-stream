import uuid

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from .base import Base

# Association table for playlist and songs
playlist_song = Table(
    "playlist_song",
    Base.metadata,
    Column("playlist_id", String, ForeignKey("playlists.id"), primary_key=True),
    Column("song_id", String, ForeignKey("songs.id"), primary_key=True),
)


class SongModel(Base):
    __tablename__ = "songs"

    id = Column(String, primary_key=True, index=True)  # YouTube ID
    title = Column(String)
    uploader = Column(String)
    thumbnail = Column(String)
    duration = Column(Integer)

    playlists = relationship("PlaylistModel", secondary=playlist_song, back_populates="songs")


class PlaylistModel(Base):
    __tablename__ = "playlists"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)

    songs = relationship("SongModel", secondary=playlist_song, back_populates="playlists")
