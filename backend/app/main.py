import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress
from logging import getLogger

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.admin import setup_admin
from app.api.api import api_router
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.db import models  # noqa: F401 - import used for registering the models
from app.db.base import SessionLocal, engine
from app.db.models.user import UserModel
from app.services.releases import ReleaseService
from app.services.roles import ensure_admin_role

setup_logging()


async def _refresh_releases_loop() -> None:
    """Periodically re-sync followed artists' releases and notify users.

    Runs as a background task for the life of the app. Each artist's YTMusic
    payload is cached, so a refresh every few hours costs one upstream call
    per artist per day.
    """
    logger = getLogger(__name__)
    while True:
        try:
            with SessionLocal() as db:
                ReleaseService.refresh_followed_artists(db)
                users = db.query(UserModel).all()
                for user in users:
                    try:
                        ReleaseService.notify_new_releases(db, user=user)
                    except Exception:
                        db.rollback()
                        logger.warning(
                            "Release notification failed for user %s",
                            user.id,
                            exc_info=True,
                        )
        except Exception:
            logger.warning("Release refresh job failed", exc_info=True)
        await asyncio.sleep(settings.NOTIFICATIONS_REFRESH_SECONDS)


def _bootstrap_root_admin() -> None:
    """Grant the admin role to ``ROOT_ADMIN_EMAIL`` at startup (idempotent).

    Gives the operator a way to create the first admin without an existing
    admin in the system. No-op when the setting is unset or the account has
    not registered yet (it will be promoted on a later start).
    """
    email = settings.ROOT_ADMIN_EMAIL.strip()
    if not email:
        return
    logger = getLogger(__name__)
    with SessionLocal() as db:
        outcome = ensure_admin_role(db, email)
    if outcome == "not_found":
        logger.warning(
            "ROOT_ADMIN_EMAIL %s is not registered yet; skipping promotion", email
        )
    elif outcome == "already_admin":
        logger.info("ROOT_ADMIN_EMAIL %s is already an admin", email)
    else:
        logger.info("Promoted ROOT_ADMIN_EMAIL %s to admin", email)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    # Run migrations on startup - using lazy import to avoid circular imports
    from alembic.config import Config  # noqa: PLC0415

    from alembic import command  # noqa: PLC0415

    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    # alembic's env.py calls logging.fileConfig(), which resets the whole
    # logging tree (root back to WARNING, our handlers removed). Re-apply our
    # console/file handlers so app logs are visible while the server runs.
    setup_logging()

    _bootstrap_root_admin()

    refresh_task = asyncio.create_task(_refresh_releases_loop())
    try:
        yield
    finally:
        refresh_task.cancel()
        with suppress(asyncio.CancelledError):
            await refresh_task


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
        expose_headers=["X-Cache-Status"],
    )

app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET_KEY)

# Setup Admin Panel
setup_admin(app, engine)

# Serve media (avatars, etc.) under /media (URL) regardless of where the files
# live on disk (MEDIA_DIR may be an absolute path inside the container).
media_path = settings.media_path
media_path.mkdir(parents=True, exist_ok=True)
settings.avatars_dir_path.mkdir(parents=True, exist_ok=True)
app.mount(
    settings.MEDIA_URL_PREFIX,
    StaticFiles(directory=str(media_path)),
    name="media",
)

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8005)
