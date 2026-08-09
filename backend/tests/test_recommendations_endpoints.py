from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.moods import MOODS
from app.db.models.user import UserModel
from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.history import HistoryService
from app.services.recommendations import (
    _rec_cache,
    youtube_service,
    ytmusic_service,
)


def _mock_songs_for(query: str) -> list[dict[str, Any]]:
    key = query.strip().lower()
    if key == "radiohead":
        return [
            {
                "id": "vid1",
                "title": "Creep",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 240,
            },
            {
                "id": "vid2",
                "title": "Karma Police",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 260,
            },
        ]
    if key.endswith(" songs"):
        genre = key[: -len(" songs")]
        return [
            {
                "id": f"{genre}-1",
                "title": f"{genre} track",
                "uploader": "DJ",
                "thumbnail": "",
                "duration": 180,
            }
        ]
    return []


@pytest.fixture(autouse=True)
def mock_youtube_search(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_search(query: str) -> tuple[list[dict[str, Any]], bool]:
        return _mock_songs_for(query), True

    monkeypatch.setattr(youtube_service, "search_songs", fake_search)
    monkeypatch.setattr(ytmusic_service, "search_songs", lambda query: [])
    monkeypatch.setattr(ytmusic_service, "find_mood_playlist", lambda mood: None)
    _rec_cache.clear()
    yield
    _rec_cache.clear()


def test_recommendations_endpoint(
    client: TestClient, db: Session, test_user: UserModel, auth_headers: dict[str, str]
) -> None:
    HistoryService.record_listen(
        db,
        user_id=test_user.id,
        data=HistoryRecordCreate(
            song=Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail=""),
            play_duration=60,
        ),
    )

    response = client.get("/api/v1/recommendations/", headers=auth_headers)
    assert response.status_code == 200
    songs = response.json()
    assert isinstance(songs, list)
    assert songs
    assert {s["id"] for s in songs} == {"vid2"}
    assert songs[0]["title"]


def test_recommendations_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/recommendations/")
    assert response.status_code == 401


def test_radio_moods_endpoint(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/radio/moods", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == MOODS


def test_radio_seeds_endpoint(
    client: TestClient, db: Session, test_user: UserModel, auth_headers: dict[str, str]
) -> None:
    test_user.favorite_genres = ["pop", "jazz"]
    db.commit()

    response = client.get("/api/v1/radio/seeds", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["genres"] == ["pop", "jazz"]
    assert "top_artists" in data


def test_radio_generate_mood(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get(
        "/api/v1/radio/",
        params={"seed_type": "mood", "seed_value": "energetic"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["seed_type"] == "mood"
    assert data["seed_value"] == "energetic"
    assert data["count"] == 4
    assert len(data["songs"]) == 4


def test_radio_generate_unknown_mood(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/v1/radio/",
        params={"seed_type": "mood", "seed_value": "nonexistent"},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_radio_generate_invalid_seed_type(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/v1/radio/",
        params={"seed_type": "foo", "seed_value": "x"},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_radio_requires_auth(client: TestClient) -> None:
    response = client.get(
        "/api/v1/radio/", params={"seed_type": "mood", "seed_value": "chill"}
    )
    assert response.status_code == 401
