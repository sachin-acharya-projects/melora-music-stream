from pydantic import BaseModel

from app.db.models.playlist import PlaylistVisibility


class Song(BaseModel):
    id: str
    title: str
    uploader: str
    thumbnail: str
    duration: int | None = 0


class PlaylistCreate(BaseModel):
    name: str
    description: str | None = None
    visibility: PlaylistVisibility = PlaylistVisibility.PRIVATE


class PlaylistUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    visibility: PlaylistVisibility | None = None


class PlaylistImport(BaseModel):
    url: str
    name: str | None = None
    id: str | None = None


class PlaybackState(BaseModel):
    last_song_id: str | None = None
    current_queue: list[Song] = []
    recent_songs: list[Song] = []
    last_playlist_id: str | None = None
