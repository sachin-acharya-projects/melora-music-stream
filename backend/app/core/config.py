from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Melora Backend"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    DEBUG: bool = False

    # Storage
    PLAYLIST_FILE: str = "playlists.json"
    DOWNLOADS_DIR: str = "downloads"
    CACHE_DIR: str = "cache"
    MEDIA_DIR: str = "media"
    AVATARS_DIR: str = "avatars"
    MAX_CACHE_SIZE_GB: int = 10
    CACHE_TTL_HOURS: int = 72
    CACHE_ENABLED: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./melora.db"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_STREAM_CACHE_TTL: int = 10800  # 3 hours in seconds

    # Auth - Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Auth - JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-random-secret"  # noqa: S105
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Service tunables
    ARTIST_SEARCH_LIMIT: int = 6
    ARTIST_CHANNEL_SONG_LIMIT: int = 20
    ARTIST_FEATURED_SECTION_LIMIT: int = 10
    ARTIST_REGISTRATION_THRESHOLD: int = 3
    ARTIST_TOP_SONGS_LIMIT: int = 20
    ARTIST_RECENT_SONGS_LIMIT: int = 10
    ARTIST_CHANNEL_PLAYLIST_LIMIT: int = 12
    ARTIST_PLAYLIST_SONGS_LIMIT: int = 30
    ARTIST_UPLOADS_LIMIT: int = 50
    ARTIST_IMPORT_MAX_WORKERS: int = 6
    ARTIST_SUGGESTIONS_TOP_ARTISTS: int = 5
    ARTIST_SUGGESTIONS_MAX: int = 100
    ARTIST_SUGGESTIONS_TTL_SECONDS: int = 12 * 60 * 60
    ARTIST_SUGGESTIONS_RETRY_SECONDS: int = 15 * 60
    SIMILAR_SONGS_LIMIT: int = 6
    USER_SEARCH_LIMIT_DEFAULT: int = 10
    USER_SEARCH_LIMIT_MAX: int = 20
    STATS_CACHE_TTL_SECONDS: int = 30 * 60
    LYRICS_CACHE_TTL_SECONDS: int = 60 * 60 * 24 * 7
    LYRICS_MISS_TTL_SECONDS: int = 60 * 60
    LRCLIB_URL: str = "https://lrclib.net/api/get"

    @property
    def media_path(self) -> Path:
        """Filesystem path of the media root directory."""
        return Path(self.MEDIA_DIR)

    @property
    def avatars_dir_path(self) -> Path:
        """Filesystem path of the avatars directory, implicitly under the media root."""
        return self.media_path / self.AVATARS_DIR

    @property
    def avatars_url_prefix(self) -> str:
        """URL prefix for avatars, implicitly under the /media mount."""
        return f"/{self.MEDIA_DIR}/{self.AVATARS_DIR}"

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()

# Ensure directories exist
Path(settings.DOWNLOADS_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.CACHE_DIR).mkdir(parents=True, exist_ok=True)
settings.media_path.mkdir(parents=True, exist_ok=True)
settings.avatars_dir_path.mkdir(parents=True, exist_ok=True)
