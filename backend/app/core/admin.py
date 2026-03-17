from fastapi import FastAPI
from sqladmin import Admin, ModelView
from sqlalchemy.engine import Engine

from app.db.models import PlaybackStateModel, PlaylistModel, SongModel


class SongAdmin(ModelView, model=SongModel):
    column_list = [SongModel.id, SongModel.title, SongModel.uploader, SongModel.created_at]
    column_searchable_list = [SongModel.title, SongModel.uploader]
    column_sortable_list = [SongModel.created_at, SongModel.title]
    name = "Song"
    name_plural = "Songs"
    icon = "fa-solid fa-music"


class PlaylistAdmin(ModelView, model=PlaylistModel):
    column_list = [PlaylistModel.id, PlaylistModel.name, PlaylistModel.created_at]
    column_searchable_list = [PlaylistModel.name]
    column_sortable_list = [PlaylistModel.created_at, PlaylistModel.name]
    name = "Playlist"
    name_plural = "Playlists"
    icon = "fa-solid fa-list"


class PlaybackStateAdmin(ModelView, model=PlaybackStateModel):
    column_list = [
        PlaybackStateModel.id,
        PlaybackStateModel.last_song_id,
        PlaybackStateModel.updated_at,
    ]
    name = "Playback State"
    name_plural = "Playback States"
    icon = "fa-solid fa-play"


def setup_admin(app: FastAPI, engine: Engine):
    admin = Admin(app, engine, title="Melora Admin")
    admin.add_view(SongAdmin)
    admin.add_view(PlaylistAdmin)
    admin.add_view(PlaybackStateAdmin)
    return admin
