from datetime import datetime

from pydantic import BaseModel


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
