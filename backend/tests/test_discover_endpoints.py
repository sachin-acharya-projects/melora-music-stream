from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services.discover import (
    MOOD_PLAYLISTS_LIMIT,
    NEW_RELEASES_LIMIT,
    SECTION_SONGS_LIMIT,
    DiscoverService,
)
from app.services.ytmusic import ytmusic_service

TOP_SONG = {
    "id": "vid-top",
    "title": "Trending",
    "uploader": "Artist",
    "thumbnail": "top.jpg",
    "duration": 200,
}
ALBUM = {
    "audio_playlist_id": "AP-1",
    "browse_id": "B-1",
    "title": "New Album",
    "artists": ["The Band"],
    "thumbnail": "album.jpg",
}
ALBUM_TRACK = {
    "id": "vid-album",
    "title": "Album Track",
    "uploader": "The Band",
    "thumbnail": "t.jpg",
    "duration": 180,
}
PLAYLIST = {
    "playlistId": "PL-1",
    "title": "Chill Beats",
    "thumbnail": "pl.jpg",
    "category": "Moods",
}
PLAYLIST_TRACK = {
    "id": "vid-pl",
    "title": "Chill Track",
    "uploader": "DJ",
    "thumbnail": "t.jpg",
    "duration": 150,
}


@pytest.fixture(autouse=True)
def mock_ytmusic(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace network-backed YTMusic discovery with deterministic stubs."""

    def top_songs(limit: int) -> list[dict[str, Any]]:
        return [TOP_SONG]

    def new_releases(limit: int) -> list[dict[str, Any]]:
        return [ALBUM]

    def album_songs(audio_playlist_id: str, limit: int) -> list[dict[str, Any]]:
        return [ALBUM_TRACK]

    def curated(limit: int) -> list[dict[str, Any]]:
        return [PLAYLIST]

    def playlist_songs(playlist_id: str, limit: int) -> list[dict[str, Any]]:
        return [PLAYLIST_TRACK]

    monkeypatch.setattr(ytmusic_service, "top_songs", top_songs)
    monkeypatch.setattr(ytmusic_service, "new_releases_albums", new_releases)
    monkeypatch.setattr(ytmusic_service, "album_songs", album_songs)
    monkeypatch.setattr(ytmusic_service, "curated_mood_playlists", curated)
    monkeypatch.setattr(ytmusic_service, "playlist_songs", playlist_songs)


class TestDiscoverService:
    def test_feed_aggregates_sections(self) -> None:
        feed = DiscoverService.get_feed()

        assert feed["top_songs"] == [TOP_SONG]
        assert len(feed["new_releases"]) == 1
        assert feed["new_releases"][0]["title"] == "New Album"
        assert feed["new_releases"][0]["songs"] == [ALBUM_TRACK]
        assert len(feed["mood_playlists"]) == 1
        assert feed["mood_playlists"][0]["playlistId"] == "PL-1"
        assert feed["mood_playlists"][0]["songs"] == [PLAYLIST_TRACK]

    def test_feed_degrades_to_empty_when_ytmusic_fails(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        def boom(*args: Any, **kwargs: Any) -> None:
            raise RuntimeError("boom")

        monkeypatch.setattr(ytmusic_service, "top_songs", boom)
        monkeypatch.setattr(ytmusic_service, "new_releases_albums", boom)

        feed = DiscoverService.get_feed()
        assert feed["top_songs"] == []
        assert feed["new_releases"] == []


def test_discover_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/discover/")
    assert response.status_code == 200
    data = response.json()
    assert data["top_songs"] == [TOP_SONG]
    assert data["new_releases"][0]["songs"][0]["id"] == "vid-album"
    assert data["mood_playlists"][0]["songs"][0]["id"] == "vid-pl"


def test_discover_constants_are_reasonable() -> None:
    assert 1 <= SECTION_SONGS_LIMIT <= 20
    assert 1 <= NEW_RELEASES_LIMIT <= 5
    assert 1 <= MOOD_PLAYLISTS_LIMIT <= 5
