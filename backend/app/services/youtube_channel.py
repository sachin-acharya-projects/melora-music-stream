from __future__ import annotations

import re
from typing import TYPE_CHECKING

from app.db.models.artist import ArtistModel

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class YouTubeChannelService:
    """Maps a YouTube channel to an ArtistModel."""

    _CHANNEL_ID_RE = re.compile(r"^UC[A-Za-z0-9_-]{22}$")

    @staticmethod
    def normalize_channel_id(channel_id: str | None) -> str | None:
        if not channel_id:
            return None
        channel_id = channel_id.strip()
        if channel_id.startswith("http"):
            match = re.search(r"(?:channel/|@)([^/\s]+)", channel_id)
            if match:
                channel_id = match.group(1)
        if not channel_id or not YouTubeChannelService._CHANNEL_ID_RE.match(channel_id):
            return None
        return channel_id

    @staticmethod
    def find_by_channel_id(db: Session, channel_id: str) -> ArtistModel | None:
        normalized = YouTubeChannelService.normalize_channel_id(channel_id)
        if not normalized:
            return None
        for artist in db.query(ArtistModel).all():
            external = artist.external_ids or {}
            if external.get("youtube_channel_id") == normalized:
                return artist
        return None
