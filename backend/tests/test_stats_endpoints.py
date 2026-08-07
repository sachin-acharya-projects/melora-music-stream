from sqlalchemy.orm import Session


def test_stats_endpoint(client, db: Session, auth_headers: dict[str, str]) -> None:
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

    response = client.get("/api/v1/stats/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_plays"] == 1
    assert data["total_play_time"] == 90
    assert data["cached"] is False

    cached = client.get("/api/v1/stats/", headers=auth_headers).json()
    assert cached["cached"] is True


def test_stats_top_endpoints(client, db: Session, auth_headers: dict[str, str]) -> None:
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

    top_artists = client.get("/api/v1/stats/top-artists", headers=auth_headers)
    assert top_artists.status_code == 200
    assert top_artists.json()[0]["name"] == "Radiohead"

    top_songs = client.get("/api/v1/stats/top-songs", headers=auth_headers)
    assert top_songs.json()[0]["song"]["id"] == "vid1"

    genres = client.get("/api/v1/stats/genres", headers=auth_headers)
    assert genres.status_code == 200

    recalc = client.post("/api/v1/stats/recalculate", headers=auth_headers)
    assert recalc.status_code == 200
    assert recalc.json()["cached"] is False
