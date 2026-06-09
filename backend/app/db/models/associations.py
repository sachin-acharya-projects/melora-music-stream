from sqlalchemy import Column, ForeignKey, String, Table

from app.db.base import Base

# Association table for playlist and songs
playlist_song = Table(
    "playlist_song",
    Base.metadata,
    Column(
        "playlist_id",
        String,
        ForeignKey("playlists.id"),
        primary_key=True,
    ),
    Column(
        "song_id",
        String,
        ForeignKey("songs.id"),
        primary_key=True,
    ),
)
