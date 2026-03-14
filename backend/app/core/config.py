import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Melora Backend"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    DEBUG: bool = False

    # Storage

    PLAYLIST_FILE: str = "playlists.json"
    DOWNLOADS_DIR: str = "downloads"

    # Database
    DATABASE_URL: str = "sqlite:///./melora.db"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()

# Ensure downloads directory exists
os.makedirs(settings.DOWNLOADS_DIR, exist_ok=True)
