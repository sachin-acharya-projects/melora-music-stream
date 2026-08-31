"""Aggregated discovery feed assembled from YTMusic sources.

Combines three global, non-personalized sections for the Home/Discover page:

- ``top_songs``: currently trending songs from the YTMusic explore feed.
- ``new_releases``: recently released albums, each with a playable song list.
- ``mood_playlists``: curated mood/genre playlists, each with a playable song
  list.

All data flows through the cached ``YTMusicService`` (24h TTL), so the feed
stays cheap after the first load. Every section degrades gracefully: a YTMusic
failure yields an empty list for that section rather than an error.
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.ytmusic import ytmusic_service

logger = logging.getLogger(__name__)

TOP_SONGS_LIMIT = 20
NEW_RELEASES_LIMIT = 6
MOOD_PLAYLISTS_LIMIT = 20
SECTION_SONGS_LIMIT = 8


class DiscoverService:
    """Build the global discovery feed."""

    @staticmethod
    def get_feed(
        top_songs_limit: int | None = None,
        new_releases_limit: int | None = None,
        mood_playlists_limit: int | None = None,
    ) -> dict[str, Any]:
        """Assemble the discovery feed from cached YTMusic data.

        Section sizes are caller-controlled so clients can request a small
        preview for Home or a larger list for a dedicated browse page.
        """
        return {
            "top_songs": DiscoverService._top_songs(top_songs_limit or TOP_SONGS_LIMIT),
            "new_releases": DiscoverService._new_releases(
                new_releases_limit or NEW_RELEASES_LIMIT
            ),
            "mood_playlists": DiscoverService._mood_playlists(
                mood_playlists_limit or MOOD_PLAYLISTS_LIMIT
            ),
        }

    @staticmethod
    def _top_songs(limit: int = TOP_SONGS_LIMIT) -> list[dict[str, Any]]:
        try:
            return ytmusic_service.top_songs(limit)
        except Exception:
            logger.warning("Discover top songs failed", exc_info=True)
            return []

    @staticmethod
    def _new_releases(limit: int = NEW_RELEASES_LIMIT) -> list[dict[str, Any]]:
        albums: list[dict[str, Any]] = []
        try:
            raw_albums = ytmusic_service.new_releases_albums(limit)
        except Exception:
            logger.warning("Discover new releases failed", exc_info=True)
            return []
        for album in raw_albums:
            try:
                songs = ytmusic_service.album_songs(
                    album["audio_playlist_id"], SECTION_SONGS_LIMIT
                )
            except Exception:
                logger.warning(
                    "Discover album songs failed for %r",
                    album.get("audio_playlist_id"),
                    exc_info=True,
                )
                songs = []
            albums.append({**album, "songs": songs})
        return albums

    @staticmethod
    def _mood_playlists(limit: int = MOOD_PLAYLISTS_LIMIT) -> list[dict[str, Any]]:
        playlists: list[dict[str, Any]] = []
        try:
            raw = ytmusic_service.curated_mood_playlists(limit)
        except Exception:
            logger.warning("Discover mood playlists failed", exc_info=True)
            return []
        for playlist in raw:
            try:
                songs = ytmusic_service.playlist_songs(
                    playlist["playlistId"], SECTION_SONGS_LIMIT
                )
            except Exception:
                logger.warning(
                    "Discover playlist songs failed for %r",
                    playlist.get("playlistId"),
                    exc_info=True,
                )
                songs = []
            playlists.append({**playlist, "songs": songs})
        return playlists


discover_service = DiscoverService()
