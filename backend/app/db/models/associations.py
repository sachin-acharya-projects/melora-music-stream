from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table

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
    Column("position", Integer, nullable=False, server_default="0"),
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

# Association table for users following playlists
playlist_follows = Table(
    "playlist_follows",
    Base.metadata,
    Column(
        "user_id",
        String,
        ForeignKey("users.id"),
        primary_key=True,
    ),
    Column(
        "playlist_id",
        String,
        ForeignKey("playlists.id"),
        primary_key=True,
    ),
    Column(
        "created_at",
        DateTime,
        default=lambda: datetime.now(UTC),
    ),
)

# Association table for songs and artists
song_artist = Table(
    "song_artist",
    Base.metadata,
    Column(
        "song_id",
        String,
        ForeignKey("songs.id"),
        primary_key=True,
    ),
    Column(
        "artist_id",
        String,
        ForeignKey("artists.id"),
        primary_key=True,
    ),
    Column(
        "role",
        String,
        default="primary",
    ),
)

# Association table for users following artists
user_artist_follows = Table(
    "user_artist_follows",
    Base.metadata,
    Column(
        "user_id",
        String,
        ForeignKey("users.id"),
        primary_key=True,
    ),
    Column(
        "artist_id",
        String,
        ForeignKey("artists.id"),
        primary_key=True,
    ),
    Column(
        "created_at",
        DateTime,
        default=lambda: datetime.now(UTC),
    ),
)
