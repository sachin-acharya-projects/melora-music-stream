from fastapi import FastAPI
from sqladmin import Admin
from sqlalchemy.engine import Engine

from app.admin.auth import AdminAuth
from app.admin.playback import PlaybackStateAdmin
from app.admin.playlists import PlaylistAdmin
from app.admin.songs import SongAdmin
from app.admin.users import UserAdmin
from app.core.config import settings


def setup_admin(app: FastAPI, engine: Engine) -> Admin:
    authentication_backend = AdminAuth(secret_key=settings.JWT_SECRET_KEY)
    admin = Admin(app, engine, title="Melora Admin", authentication_backend=authentication_backend)
    admin.add_view(SongAdmin)
    admin.add_view(PlaylistAdmin)
    admin.add_view(PlaybackStateAdmin)
    admin.add_view(UserAdmin)
    return admin
