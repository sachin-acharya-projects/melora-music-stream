from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services.ytmusic import ytmusic_service

ALBUM_TRACKS = [
    {"id": "al-1", "title": "Track One", "uploader": "Radiohead", "thumbnail": "", "duration": 200},
    {"id": "al-2", "title": "Track Two", "uploader": "Radiohead", "thumbnail": "", "duration": 210},
]


@pytest.fixture(autouse=True)
def mock_ytmusic(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ytmusic_service,
        "playlist_songs",
        lambda playlist_id, limit: ALBUM_TRACKS if playlist_id == "OLAK-a" else [],
    )
    monkeypatch.setattr(
        ytmusic_service,
        "browse_album_songs",
        lambda browse_id, limit: ALBUM_TRACKS if browse_id == "MPREb-a" else [],
    )


def test_favorite_then_list_and_get(client: TestClient, auth_headers: dict[str, str]) -> None:
    payload: dict[str, Any] = {
        "title": "OK Computer",
        "artist_name": "Radiohead",
        "year": 1997,
        "thumbnail_url": "https://img/a.png",
        "audio_playlist_id": "OLAK-a",
    }
    resp = client.post("/api/v1/albums/MPREb-a/favorite", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["browse_id"] == "MPREb-a"
    assert body["title"] == "OK Computer"

    listing = client.get("/api/v1/albums/favorites", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    detail = client.get("/api/v1/albums/MPREb-a", headers=auth_headers)
    assert detail.status_code == 200
    detail_body = detail.json()
    assert detail_body["is_favorite"] is True
    assert [t["id"] for t in detail_body["tracks"]] == ["al-1", "al-2"]


def test_favorite_requires_auth(client: TestClient) -> None:
    resp = client.post("/api/v1/albums/MPREb-a/favorite", json={})
    assert resp.status_code in (401, 403)


def test_unfavorite(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.post(
        "/api/v1/albums/MPREb-a/favorite",
        json={"title": "OK Computer", "audio_playlist_id": "OLAK-a"},
        headers=auth_headers,
    )
    resp = client.delete("/api/v1/albums/MPREb-a/favorite", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    assert client.get("/api/v1/albums/favorites", headers=auth_headers).json() == []


def test_get_missing_album_returns_404(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/albums/MPREb-missing", headers=auth_headers)
    assert resp.status_code == 404
