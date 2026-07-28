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

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()

# Ensure downloads and cache directories exist
Path(settings.DOWNLOADS_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.CACHE_DIR).mkdir(parents=True, exist_ok=True)
