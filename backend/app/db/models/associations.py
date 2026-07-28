from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Table

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

# Association table for user follows (self-referential many-to-many)
user_follows = Table(
    "user_follows",
    Base.metadata,
    Column(
        "follower_id",
        String,
        ForeignKey("users.id"),
        primary_key=True,
    ),
    Column(
        "following_id",
        String,
        ForeignKey("users.id"),
        primary_key=True,
    ),
    Column(
        "created_at",
        DateTime,
        default=lambda: datetime.now(UTC),
    ),
)
