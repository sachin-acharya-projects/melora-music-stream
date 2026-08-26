from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AlbumFavoriteCreate(BaseModel):
    """Optional metadata snapshot for an album, supplied by the client when it
    already has the data from a search result so no extra YTMusic lookup is
    needed to save the library entry.
    """

    title: str | None = Field(default=None, max_length=300)
    artist_name: str | None = Field(default=None, max_length=300)
    year: int | None = Field(default=None, ge=1000, le=3000)
    thumbnail_url: str | None = Field(default=None, max_length=2000)
    audio_playlist_id: str | None = Field(default=None, max_length=100)


class AlbumResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    browse_id: str
    audio_playlist_id: str | None = None
    title: str
    artist_name: str | None = None
    thumbnail_url: str | None = None
    year: int | None = None


class FavoriteAlbum(BaseModel):
    """A favorited album with the favorited-at timestamp."""

    album: AlbumResponse
    favorited_at: str
