from datetime import datetime

from pydantic import BaseModel, Field


class AdminSettingsResponse(BaseModel):
    project_name: str
    debug: bool
    cache_enabled: bool
    max_cache_size_gb: int
    cache_ttl_hours: int
    redis_stream_cache_ttl: int
    jwt_access_token_expire_minutes: int
    jwt_refresh_token_expire_days: int
    frontend_url: str
    oauth_configured: bool
    updated_at: datetime | None = None


class AdminSettingsUpdate(BaseModel):
    cache_enabled: bool | None = None
    max_cache_size_gb: int | None = None
    cache_ttl_hours: int | None = None
    jwt_access_token_expire_minutes: int | None = None
    jwt_refresh_token_expire_days: int | None = None


class AdminDashboardResponse(BaseModel):
    artists_total: int
    artists_published: int
    artists_hidden: int
    artists_featured: int
    songs_total: int
    songs_published: int
    songs_hidden: int
    songs_featured: int
    users_total: int
    active_users: int
    total_plays: int
    plays_last_30_days: int


class ArtistUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=2000)
    genres: list[str] | None = None
    thumbnail_url: str | None = Field(default=None, max_length=2000)


class SongUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    uploader: str | None = Field(default=None, max_length=500)
    thumbnail: str | None = Field(default=None, max_length=2000)


class SongImportRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class PlaylistImportRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class BatchArtistImportRequest(BaseModel):
    items: list[str] = Field(min_length=1, max_length=50)
    thumbnail: str | None = None


class UserAdminUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None
