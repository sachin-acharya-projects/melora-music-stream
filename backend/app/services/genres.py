"""Best-effort genre resolution for artist names.

Genres for an artist name come from two sources, in order:

1. A materialized :class:`ArtistModel` whose ``genres`` column is populated
   (set from MusicBrainz enrichment or the admin console).
2. A cached MusicBrainz search + lookup (with ``inc=genres``).

Resolution never raises and is cached for a long TTL, so stats recalculation
and radio seeding don't hammer MusicBrainz. Empty results are cached too, so
an artist with no MusicBrainz data isn't re-queried for a month.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.cache import cache_get_or_set
from app.core.config import settings
from app.db.models.artist import ArtistModel
from app.services.metadata_enrichment import ArtistEnricher

logger = logging.getLogger(__name__)


class GenreService:
    """Resolve genre tags for artist names."""

    @staticmethod
    def resolve_artist_genres(db: Session, name: str) -> list[str]:
        """Genres for an artist name, preferring materialized artist data."""
        normalized = (name or "").strip().lower()
        if not normalized:
            return []

        artist = (
            db.query(ArtistModel)
            .filter(func.lower(ArtistModel.name) == normalized)
            .first()
        )
        if artist is not None and artist.genres:
            return artist.genres[:10]

        key = f"genres:artist:{normalized}"
        value, _ = cache_get_or_set(
            key,
            settings.GENRES_CACHE_TTL_SECONDS,
            lambda: GenreService._resolve_musicbrainz(name),
            cache_falsy=True,
        )
        return value

    @staticmethod
    def _resolve_musicbrainz(name: str) -> list[str]:
        """Search MusicBrainz and return genres from the best matching artist."""
        results = ArtistEnricher.search(name, limit=3)
        for result in results:
            musicbrainz_id = result.get("id")
            if not musicbrainz_id:
                continue
            genres = ArtistEnricher.artist_genres(musicbrainz_id)
            if genres:
                return genres[:10]
        return []
