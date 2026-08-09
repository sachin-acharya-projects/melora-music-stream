"""Curated mood definitions used as radio seeds.

Each mood maps to genre seeds. Genres are first matched against enriched
artist genres (MusicBrainz) when generating radio; if no artist matches, the
radio falls back to a direct YouTube search for the genre.
"""

from typing import Any

MOODS: list[dict[str, Any]] = [
    {
        "id": "energetic",
        "label": "Energetic",
        "genres": ["dance", "electronic", "rock", "workout"],
    },
    {
        "id": "chill",
        "label": "Chill",
        "genres": ["chill", "lofi", "r&b", "acoustic", "reggae"],
    },
    {
        "id": "focused",
        "label": "Focused",
        "genres": ["instrumental", "lofi", "ambient", "study", "classical"],
    },
    {
        "id": "happy",
        "label": "Happy",
        "genres": ["pop", "funk", "disco", "reggaeton"],
    },
    {
        "id": "melancholy",
        "label": "Melancholy",
        "genres": ["ballad", "indie", "r&b", "soul"],
    },
    {
        "id": "party",
        "label": "Party",
        "genres": ["hip hop", "dance", "edm", "afrobeats"],
    },
    {
        "id": "sleep",
        "label": "Sleep",
        "genres": ["ambient", "lofi", "acoustic", "rain"],
    },
    {
        "id": "workout",
        "label": "Workout",
        "genres": ["edm", "hip hop", "rock", "trap"],
    },
]
