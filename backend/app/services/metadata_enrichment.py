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
        results = ArtistEnricher.search(name, limit=10)
        if not results:
            return None

        def normalize(value: str) -> str:
            decomposed = unicodedata.normalize("NFKD", value).casefold()
            plain = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
            return re.sub(r"[^a-z0-9]+", "", plain)

        requested_name = normalize(name)
        exact_matches = [
            item for item in results
            if normalize(str(item.get("name") or "")) == requested_name
            and int(item.get("score") or 0) >= 95
            and item.get("id")
        ]
        if len(exact_matches) != 1:
            logger.info(
                "MusicBrainz identity unresolved for %r (%d exact candidates)",
                name, len(exact_matches),
            )
            return None

        best = exact_matches[0]
        mbid = str(best["id"])
        entity_type = {
            "Person": "person", "Group": "group", "Orchestra": "orchestra",
            "Choir": "choir", "Character": "character", "Other": "other",
        }.get(str(best.get("type") or ""), "unknown")
        fields: dict[str, Any] = {
            "external_ids": {"musicbrainz_id": mbid},
            "identity": {
                "entity_type": entity_type,
                "status": "verified",
                "confidence": min(1.0, int(best.get("score") or 0) / 100),
                "source": "musicbrainz",
            },
        }
        if best.get("disambiguation"):
            fields["bio"] = best["disambiguation"]
        genres = ArtistEnricher.artist_genres(mbid)
        if genres:
            fields["genres"] = genres
        return fields
