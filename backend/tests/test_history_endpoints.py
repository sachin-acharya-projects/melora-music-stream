from sqlalchemy.orm import Session

from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.history import HistoryService


def test_record_and_listen_history(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/history/",
        headers=auth_headers,
        json={
            "song": {
                "id": "vid1",
                "title": "Creep",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 240,
            },
            "play_duration": 60,
        },
    )
    assert response.status_code == 200
    assert response.json()["song"]["id"] == "vid1"

    list_response = client.get("/api/v1/history/", headers=auth_headers)
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["song"]["id"] == "vid1"


def test_recent_history(client, db: Session, auth_headers: dict[str, str]) -> None:
    HistoryService.record_listen(
        db,
        user_id="someone-else",
        data=HistoryRecordCreate(
            song=Song(id="vid-other", title="Other", uploader="X", thumbnail="")
        ),
    )
    client.post(
        "/api/v1/history/",
        headers=auth_headers,
        json={
            "song": {
                "id": "vid1",
                "title": "Creep",
                "uploader": "Radiohead",
                "thumbnail": "",
            }
        },
    )

    response = client.get("/api/v1/history/recent", headers=auth_headers)
    assert response.status_code == 200
    assert [item["song"]["id"] for item in response.json()] == ["vid1"]


def test_history_update_play_duration(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    created = client.post(
        "/api/v1/history/",
        headers=auth_headers,
        json={
            "song": {
                "id": "vid1",
                "title": "Creep",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 240,
            },
            "play_duration": 0,
        },
    )
    entry_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/history/{entry_id}",
        headers=auth_headers,
        json={"play_duration": 120},
    )
    assert response.status_code == 200
    assert response.json()["play_duration"] == 120

    list_response = client.get("/api/v1/history/", headers=auth_headers)
    assert list_response.json()["items"][0]["play_duration"] == 120


def test_history_update_play_duration_not_found(
    client, auth_headers: dict[str, str]
) -> None:
    response = client.patch(
        "/api/v1/history/nope", headers=auth_headers, json={"play_duration": 10}
    )
    assert response.status_code == 404


def test_history_stats(client, db: Session, auth_headers: dict[str, str]) -> None:
    client.post(
        "/api/v1/history/",
        headers=auth_headers,
        json={
            "song": {
                "id": "vid1",
                "title": "Creep",
                "uploader": "Radiohead",
                "thumbnail": "",
            },
            "play_duration": 90,
        },
    )

    response = client.get("/api/v1/history/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_plays"] == 1
    assert data["total_play_time"] == 90
    assert data["top_artists"][0]["name"] == "Radiohead"
