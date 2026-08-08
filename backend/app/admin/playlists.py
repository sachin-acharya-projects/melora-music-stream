from collections.abc import Sequence
from typing import Any, ClassVar

from sqladmin import ModelView

from app.db.models.playlist import PlaylistModel


class PlaylistAdmin(ModelView, model=PlaylistModel):
    column_list: ClassVar[Sequence[Any]] = [
        PlaylistModel.id,
        PlaylistModel.name,
        PlaylistModel.created_at,
    ]
    column_searchable_list: ClassVar[Sequence[Any]] = [PlaylistModel.name]
    column_sortable_list: ClassVar[Sequence[Any]] = [
        PlaylistModel.created_at,
        PlaylistModel.name,
    ]
    name = "Playlist"
    name_plural = "Playlists"
    icon = "fa-solid fa-list"
