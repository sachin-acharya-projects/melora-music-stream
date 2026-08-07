from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException

from app.core.config import settings
from app.core.messages import Messages
from app.schemas.song import Song
from app.services.artist import ArtistService
from app.services.songs import SongService
from app.services.youtube import youtube_service
from app.services.youtube_channel import YouTubeChannelService

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.schemas.artist import YouTubeArtistImport

logger = logging.getLogger(__name__)


class YouTubeArtistService:
    """Search and import YouTube channels as artists."""

    @staticmethod
    def search(db: Session, *, query: str, limit: int = settings.ARTIST_SEARCH_LIMIT) -> dict[str, Any]:
        channels = youtube_service.search_artists(query, limit=limit)
        items = []
        for channel in channels:
            channel_id = channel["channel_id"]
            items.append(
                {
                    "channel_id": channel_id,
                    "name": channel["name"],
                    "thumbnail": channel["thumbnail"],
                    "subscribers": channel["subscribers"],
                    "url": channel["url"],
                    "is_in_library": YouTubeChannelService.find_by_channel_id(
                        db, channel_id
                    )
                    is not None,
                }
            )
        return {"total": len(items), "items": items}

    @staticmethod
    def import_artist(db: Session, data: YouTubeArtistImport) -> dict[str, Any]:
        channel_id = YouTubeChannelService.normalize_channel_id(data.channel_id)
        if not channel_id:
            raise HTTPException(status_code=400, detail=Messages.INVALID_YOUTUBE_CHANNEL_ID)

        db_artist = ArtistService.get_or_create_artist(
            db, data.name, youtube_channel_id=channel_id
        )

        try:
            metadata = youtube_service.get_channel_metadata(channel_id)
        except Exception:
            logger.warning(
                "Failed to resolve channel metadata for %s", channel_id, exc_info=True
            )
            metadata = {}

        if metadata.get("thumbnail"):
            db_artist.thumbnail_url = metadata["thumbnail"]
        elif not db_artist.thumbnail_url and data.thumbnail:
            db_artist.thumbnail_url = data.thumbnail

        if metadata.get("description") and not db_artist.bio:
            db_artist.bio = metadata["description"]

        if metadata:
            db_artist.channel_metadata = {
                "subscribers": metadata.get("subscribers"),
                "view_count": metadata.get("view_count"),
                "video_count": metadata.get("video_count"),
                "country": metadata.get("country"),
                "is_verified": metadata.get("is_verified"),
                "handle": metadata.get("handle"),
                "channel_url": metadata.get("channel_url"),
                "description": metadata.get("description") or "",
                "links": metadata.get("links") or [],
            }

        db.commit()

        try:
            songs = youtube_service.get_channel_uploads(
                channel_id, limit=settings.ARTIST_CHANNEL_SONG_LIMIT
            )
        except Exception:
            logger.warning(
                "Failed to fetch channel songs for %s", channel_id, exc_info=True
            )
            songs = []

        for song in songs:
            try:
                db_song = SongService.upsert_song(db, Song(**song))
                ArtistService.sync_song_artists(db, db_song)
            except Exception:
                db.rollback()
                logger.warning(
                    "Failed to upsert channel song %r", song.get("id"), exc_info=True
                )

        ArtistService.sync_ytmusic_content(db, db_artist, channel_id)

        db.refresh(db_artist)
        return {"slug": db_artist.slug, "id": db_artist.id}
