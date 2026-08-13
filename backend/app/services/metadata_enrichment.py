from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

MUSICBRAINZ_API = "https://musicbrainz.org/ws/2/artist"
HEADERS = {
    "User-Agent": (
        "MeloraMusicStream/1.0 "
        "(https://github.com/sachin-acharya-projects/melora-music-stream)"
    )
}


class ArtistEnricher:
    """MusicBrainz artist metadata enrichment. Best-effort, never raises."""

    @staticmethod
    def search(query: str, *, limit: int = 5) -> list[dict[str, Any]]:
        try:
            response = httpx.get(
                MUSICBRAINZ_API,
                params={"query": f'"{query}"', "fmt": "json", "limit": limit},
                headers=HEADERS,
                timeout=10,
            )
            response.raise_for_status()
            artists = response.json().get("artists", [])
            return list(artists) if isinstance(artists, list) else []
        except (httpx.HTTPError, ValueError):
            logger.warning("MusicBrainz search failed for %r", query)
            return []

    @staticmethod
    def artist_genres(musicbrainz_id: str) -> list[str]:
        """Fetch genre tags for a MusicBrainz artist via a lookup call.

        The search endpoint's artist dicts never include ``genres``; they are
        only returned by a lookup with ``inc=genres``.
        """
        try:
            response = httpx.get(
                f"{MUSICBRAINZ_API}/{musicbrainz_id}",
                params={"fmt": "json", "inc": "genres"},
                headers=HEADERS,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
        except (httpx.HTTPError, ValueError):
            logger.warning("MusicBrainz lookup failed for %s", musicbrainz_id)
            return []
        genres = [g.get("name") for g in data.get("genres", []) if g.get("name")]
        return genres[:10]

    @staticmethod
    def enrich(name: str) -> dict[str, Any] | None:
        """Look up an artist and return fields to merge into the ArtistModel."""
        results = ArtistEnricher.search(name, limit=1)
        if not results:
            return None
        best = results[0]
        fields: dict[str, Any] = {"external_ids": {"musicbrainz_id": best.get("id")}}
        if best.get("disambiguation"):
            fields["bio"] = best["disambiguation"]
        genres = ArtistEnricher.artist_genres(best["id"])
        if genres:
            fields["genres"] = genres
        return fields
