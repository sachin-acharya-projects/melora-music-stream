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
    def enrich(name: str) -> dict[str, Any] | None:
        """Look up an artist and return fields to merge into the ArtistModel."""
        results = ArtistEnricher.search(name, limit=1)
        if not results:
            return None
        best = results[0]
        fields: dict[str, Any] = {"external_ids": {"musicbrainz_id": best.get("id")}}
        if best.get("disambiguation"):
            fields["bio"] = best["disambiguation"]
        genres = [g.get("name") for g in best.get("genres", []) if g.get("name")]
        if genres:
            fields["genres"] = genres[:10]
        return fields
