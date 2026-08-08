from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.admin import setup_admin
from app.api.api import api_router
from app.core.config import settings
from app.db import models  # noqa: F401 - import used for registering the models
from app.db.base import engine


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    # Run migrations on startup - using lazy import to avoid circular imports
    from alembic.config import Config  # noqa: PLC0415

    from alembic import command  # noqa: PLC0415

    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS Middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET_KEY)

# Setup Admin Panel
setup_admin(app, engine)

# Serve media (avatars, etc.) under /media
media_path = settings.media_path
media_path.mkdir(parents=True, exist_ok=True)
settings.avatars_dir_path.mkdir(parents=True, exist_ok=True)
app.mount(
    f"/{settings.MEDIA_DIR}",
    StaticFiles(directory=str(media_path)),
    name="media",
)

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8005)
