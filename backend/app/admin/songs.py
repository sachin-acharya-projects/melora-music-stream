from collections.abc import Sequence
from typing import Any, ClassVar

from sqladmin import ModelView

from app.db.models.song import SongModel


class SongAdmin(ModelView, model=SongModel):
    column_list: ClassVar[Sequence[Any]] = [
        SongModel.id,
        SongModel.title,
        SongModel.uploader,
        SongModel.created_at,
    ]
    column_searchable_list: ClassVar[Sequence[Any]] = [
        SongModel.title,
        SongModel.uploader,
    ]
    column_sortable_list: ClassVar[Sequence[Any]] = [
        SongModel.created_at,
        SongModel.title,
    ]
    name = "Song"
    name_plural = "Songs"
    icon = "fa-solid fa-music"
