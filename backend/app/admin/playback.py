from collections.abc import Sequence
from typing import Any, ClassVar

from sqladmin import ModelView

from app.db.models.playback_state import PlaybackStateModel


class PlaybackStateAdmin(ModelView, model=PlaybackStateModel):
    column_list: ClassVar[Sequence[Any]] = [
        PlaybackStateModel.id,
        PlaybackStateModel.last_song_id,
        PlaybackStateModel.updated_at,
    ]
    name = "Playback State"
    name_plural = "Playback States"
    icon = "fa-solid fa-play"
