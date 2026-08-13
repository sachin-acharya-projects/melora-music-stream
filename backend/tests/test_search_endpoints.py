from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services.youtube import youtube_service
from app.services.ytmusic import ytmusic_service

SEARCH_RESULTS: dict[str, Any] = {
    "top_result": {"type": "song", "id": "vid-1", "title": "Creep", "uploader": "Radiohead", "thumbnail": "", "duration": 240},
    "artists": [{"id": "UC-a", "name": "Radiohead", "thumbnail": ""}],
    "songs": [{"id": "vid-2", "title": "Karma Police", "uploader": "Radiohead", "thumbnail": "", "duration": 260}],
    "albums": [{"id": "MPREb-a", "title": "OK Computer", "artists": ["Radiohead"], "year": 1997, "thumbnail": "", "audio_playlist_id": "OLAK-a"}],
    "playlists": [{"id": "PL-a", "title": "Radiohead Essentials", "thumbnail": "", "song_count": 25}],
    "videos": [{"id": "vid-3", "title": "Creep (Video)", "uploader": "Radiohead", "thumbnail": "", "duration": 240}],
    "cached": True,
}

FALLBACK_SONGS = [{"id": "yt-1", "title": "Something", "uploader": "Someone", "thumbnail": "", "duration": 100}]


@pytest.fixture(autouse=True)
def mock_search_services(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ytmusic_service, "search_all", lambda query: dict(SEARCH_RESULTS)
    )
    monkeypatch.setattr(
        ytmusic_service,
        "search_suggestions",
        lambda query: ["radiohead", "radiohead karma police"],
    )
    monkeypatch.setattr(
        ytmusic_service,
        "playlist_songs",
        lambda playlist_id, limit: (
            [{"id": "pl-song", "title": "From Playlist", "uploader": "A", "thumbnail": "", "duration": 100}]
            if playlist_id == "PL-a"
            else []
        ),
    )
    monkeypatch.setattr(
        ytmusic_service,
        "browse_album_songs",
        lambda browse_id, limit: (
            [{"id": "al-song", "title": "From Album", "uploader": "Radiohead", "thumbnail": "", "duration": 200}]
            if browse_id == "MPREb-a"
            else []
        ),
    )
    monkeypatch.setattr(
        youtube_service, "search_songs", lambda query: (FALLBACK_SONGS, True)
    )


def test_search_grouped(client: TestClient) -> None:
    response = client.get("/api/v1/search/", params={"q": "radiohead"})
    assert response.status_code == 200
    data = response.json()
    assert data["top_result"]["type"] == "song"
    assert [a["name"] for a in data["artists"]] == ["Radiohead"]
    assert {s["id"] for s in data["songs"]} == {"vid-2"}
    assert data["albums"][0]["audio_playlist_id"] == "OLAK-a"
    assert data["playlists"][0]["song_count"] == 25
    assert {v["id"] for v in data["videos"]} == {"vid-3"}


def test_search_sets_cache_header(client: TestClient) -> None:
    response = client.get("/api/v1/search/", params={"q": "radiohead"})
    assert response.headers.get("x-cache-status") == "HIT"


def test_search_falls_back_to_youtube_when_ytmusic_empty(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(ytmusic_service, "search_all", lambda query: {"top_result": None, "artists": [], "songs": [], "albums": [], "playlists": [], "videos": [], "cached": False})
    response = client.get("/api/v1/search/", params={"q": "anything"})
    assert response.status_code == 200
    data = response.json()
    assert {s["id"] for s in data["songs"]} == {"yt-1"}


def test_search_suggestions_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/search/suggestions", params={"q": "radio"})
    assert response.status_code == 200
    assert response.json() == ["radiohead", "radiohead karma police"]


def test_search_tracks_playlist(client: TestClient) -> None:
    response = client.get("/api/v1/search/tracks", params={"playlist_id": "PL-a"})
    assert response.status_code == 200
    assert response.json()[0]["id"] == "pl-song"


def test_search_tracks_falls_back_to_album(client: TestClient) -> None:
    response = client.get("/api/v1/search/tracks", params={"playlist_id": "MPREb-a"})
    assert response.status_code == 200
    assert response.json()[0]["id"] == "al-song"


def test_search_requires_query(client: TestClient) -> None:
    response = client.get("/api/v1/search/")
    assert response.status_code == 422
