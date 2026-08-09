from typing import Any

import pytest

from app.services.ytmusic import (
    YTMusicService,
    _normalize_track,
    _parse_duration,
    _pick_thumbnail,
)


class FakeYTMusic:
    """Minimal stand-in for ytmusicapi.YTMusic."""

    def __init__(self) -> None:
        self.search_results: list[dict[str, Any]] = []
        self.watch_tracks: list[dict[str, Any]] = []
        self.mood_categories: dict[str, Any] = {}
        self.mood_playlists: dict[str, list[dict[str, Any]]] = {}
        self.playlist_tracks: dict[str, list[dict[str, Any]]] = {}
        self.explore_payload: dict[str, Any] = {}
        self.raise_on: str | None = None

    def search(self, query: str, filter: str, limit: int) -> list[dict[str, Any]]:  # noqa: A002
        if self.raise_on == "search":
            raise RuntimeError("boom")
        return self.search_results

    def get_watch_playlist(self, videoId: str, limit: int) -> dict[str, Any]:  # noqa: N803
        if self.raise_on == "watch":
            raise RuntimeError("boom")
        return {"tracks": self.watch_tracks}

    def get_mood_categories(self) -> dict[str, Any]:
        if self.raise_on == "mood_categories":
            raise RuntimeError("boom")
        return self.mood_categories

    def get_mood_playlists(self, params: str) -> list[dict[str, Any]]:
        if self.raise_on == "mood_playlists":
            raise RuntimeError("boom")
        return self.mood_playlists.get(params, [])

    def get_playlist(self, playlist_id: str, limit: int) -> dict[str, Any]:
        if self.raise_on == "playlist":
            raise RuntimeError("boom")
        return {"tracks": self.playlist_tracks.get(playlist_id, [])}

    def get_explore(self) -> dict[str, Any]:
        if self.raise_on == "explore":
            raise RuntimeError("boom")
        return self.explore_payload


@pytest.fixture
def service(monkeypatch: pytest.MonkeyPatch) -> tuple[YTMusicService, FakeYTMusic]:
    svc = YTMusicService()
    fake = FakeYTMusic()
    monkeypatch.setattr(svc, "_client_instance", fake)
    return svc, fake


TRACK = {
    "videoId": "abc123",
    "title": "Some Song",
    "artists": [{"name": "The Band"}],
    "thumbnails": [{"url": "small.jpg"}, {"url": "large.jpg"}],
    "duration_seconds": 187,
}


def test_normalize_track_maps_video_id_to_song_id() -> None:
    song = _normalize_track(TRACK)
    assert song["id"] == "abc123"
    assert song["title"] == "Some Song"
    assert song["uploader"] == "The Band"
    assert song["thumbnail"] == "large.jpg"
    assert song["duration"] == 187


def test_normalize_track_string_duration() -> None:
    song = _normalize_track({**TRACK, "duration_seconds": None, "duration": "3:07"})
    assert song["duration"] == 187


def test_normalize_track_missing_artist() -> None:
    song = _normalize_track({**TRACK, "artists": []})
    assert song["uploader"] == "Unknown"


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (187, 187),
        ("3:45", 225),
        ("1:02:03", 3723),
        (None, 0),
        ("not-a-duration", 0),
        (True, 0),
    ],
)
def test_parse_duration(value: Any, expected: int) -> None:
    assert _parse_duration(value) == expected


def test_pick_thumbnail_returns_highest_resolution() -> None:
    assert _pick_thumbnail(TRACK["thumbnails"]) == "large.jpg"
    assert _pick_thumbnail([]) == ""
    assert _pick_thumbnail(None) == ""


def test_search_songs_normalizes(service: tuple[YTMusicService, FakeYTMusic]) -> None:
    svc, fake = service
    fake.search_results = [TRACK]
    songs = svc.search_songs("radiohead")
    assert songs == [_normalize_track(TRACK)]


def test_search_songs_skips_items_without_video_id(
    service: tuple[YTMusicService, FakeYTMusic],
) -> None:
    svc, fake = service
    fake.search_results = [TRACK, {"title": "No id here"}]
    songs = svc.search_songs("query")
    assert len(songs) == 1


def test_related_songs_excludes_seed(
    service: tuple[YTMusicService, FakeYTMusic],
) -> None:
    svc, fake = service
    fake.watch_tracks = [
        TRACK,
        {**TRACK, "videoId": "seed-1", "title": "The Seed"},
    ]
    songs = svc.related_songs("seed-1")
    ids = {s["id"] for s in songs}
    assert ids == {"abc123"}


def test_mood_catalog_builds_from_categories(
    service: tuple[YTMusicService, FakeYTMusic],
) -> None:
    svc, fake = service
    fake.mood_categories = {
        "Moods": [
            {"title": "Chill Beats", "params": "Pchill"},
            {"title": "Party Mix", "params": "Pparty"},
        ],
        "Genres": [
            {"title": "Rock Classics", "params": "Prock"},
        ],
    }
    fake.mood_playlists = {
        "Pchill": [{"playlistId": "pl-1", "title": "Chill Beats", "thumbnails": []}],
        "Pparty": [{"playlistId": "pl-2", "title": "Party Mix", "thumbnails": []}],
        "Prock": [{"playlistId": "pl-3", "title": "Rock Classics", "thumbnails": []}],
    }
    catalog = svc.mood_catalog()
    assert len(catalog) == 3
    assert {p["playlistId"] for p in catalog} == {"pl-1", "pl-2", "pl-3"}
    assert catalog[0]["category"] == "Moods"


def test_mood_catalog_handles_sectioned_dict(
    service: tuple[YTMusicService, FakeYTMusic],
) -> None:
    """get_mood_categories returns {section: [categories]}, not a flat list."""
    svc, fake = service
    fake.mood_categories = {
        "For you": [{"title": "1980s", "params": "P80s"}],
        "Genres": [{"title": "Dance & Electronic", "params": "Pdance"}],
    }
    fake.mood_playlists = {
        "P80s": [{"playlistId": "pl-80s", "title": "80s Hits", "thumbnails": []}],
        "Pdance": [{"playlistId": "pl-dance", "title": "Dance Hits", "thumbnails": []}],
    }
    catalog = svc.mood_catalog()
    assert {p["playlistId"] for p in catalog} == {"pl-80s", "pl-dance"}
    assert {p["category"] for p in catalog} == {"For you", "Genres"}


def test_find_mood_playlist_matches_keywords(
    service: tuple[YTMusicService, FakeYTMusic],
) -> None:
    svc, fake = service
    fake.mood_categories = {"Moods": [{"title": "Chill", "params": "Pchill"}]}
    fake.mood_playlists = {"Pchill": [{"playlistId": "pl-chill", "title": "Deep Chill"}]}
    mood = {"id": "chill", "label": "Chill", "genres": ["chill", "lofi"]}
    playlist = svc.find_mood_playlist(mood)
    assert playlist is not None
    assert playlist["playlistId"] == "pl-chill"


def test_playlist_songs(service: tuple[YTMusicService, FakeYTMusic]) -> None:
    svc, fake = service
    fake.playlist_tracks = {"pl-1": [TRACK]}
    songs = svc.playlist_songs("pl-1")
    assert songs == [_normalize_track(TRACK)]


def test_new_releases_albums(service: tuple[YTMusicService, FakeYTMusic]) -> None:
    svc, fake = service
    fake.explore_payload = {
        "new_releases": [
            {
                "title": "New Album",
                "audioPlaylistId": "AP-1",
                "browseId": "B-1",
                "artists": [{"name": "The Band"}],
                "thumbnails": [{"url": "art.jpg"}],
            },
            {"title": "No playlist id"},
        ]
    }
    albums = svc.new_releases_albums()
    assert len(albums) == 1
    assert albums[0]["audio_playlist_id"] == "AP-1"


def test_top_songs(service: tuple[YTMusicService, FakeYTMusic]) -> None:
    svc, fake = service
    fake.explore_payload = {"top_songs": {"items": [TRACK]}}
    songs = svc.top_songs()
    assert songs == [_normalize_track(TRACK)]


def test_failures_degrade_to_empty(
    service: tuple[YTMusicService, FakeYTMusic],
) -> None:
    svc, fake = service
    fake.raise_on = "search"
    assert svc.search_songs("query") == []

    fake.raise_on = "watch"
    assert svc.related_songs("vid") == []

    fake.raise_on = "explore"
    assert svc.explore() == {}

    fake.raise_on = "mood_categories"
    assert svc.mood_catalog() == []

    fake.raise_on = "playlist"
    assert svc.playlist_songs("pl-1") == []
