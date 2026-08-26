from fastapi.testclient import TestClient

from app.services.ytmusic import ytmusic_service

SEARCH_RESULTS = {
    "top_result": {"type": "song", "id": "vid-1", "title": "Creep", "uploader": "Radiohead", "thumbnail": "", "duration": 240},
    "artists": [],
    "songs": [],
    "albums": [],
    "playlists": [],
    "videos": [],
    "cached": True,
}


def test_search_records_history(
    client: TestClient, auth_headers: dict[str, str], monkeypatch: object
) -> None:
    monkeypatch.setattr(ytmusic_service, "search_all", lambda query: dict(SEARCH_RESULTS))
    client.get("/api/v1/search/", params={"q": "radiohead"}, headers=auth_headers)

    history = client.get("/api/v1/search/history", headers=auth_headers)
    assert history.status_code == 200
    queries = [h["query"] for h in history.json()]
    assert "radiohead" in queries


def test_history_dedupes_by_user(
    client: TestClient, auth_headers: dict[str, str], monkeypatch: object
) -> None:
    monkeypatch.setattr(ytmusic_service, "search_all", lambda query: dict(SEARCH_RESULTS))
    client.get("/api/v1/search/?q=radiohead", headers=auth_headers)
    client.get("/api/v1/search/?q=RADIOHEAD", headers=auth_headers)

    history = client.get("/api/v1/search/history", headers=auth_headers).json()
    matching = [h["query"] for h in history if h["query"].lower() == "radiohead"]
    assert len(matching) == 1


def test_delete_and_clear_history(
    client: TestClient, auth_headers: dict[str, str], monkeypatch: object
) -> None:
    monkeypatch.setattr(ytmusic_service, "search_all", lambda query: dict(SEARCH_RESULTS))
    client.get("/api/v1/search/?q=radiohead", headers=auth_headers)
    history = client.get("/api/v1/search/history", headers=auth_headers).json()
    assert history

    entry_id = history[0]["id"]
    resp = client.delete(f"/api/v1/search/history/{entry_id}", headers=auth_headers)
    assert resp.status_code == 200

    clear = client.delete("/api/v1/search/history", headers=auth_headers)
    assert clear.status_code == 200
    assert client.get("/api/v1/search/history", headers=auth_headers).json() == []


def test_history_requires_auth(client: TestClient, monkeypatch: object) -> None:
    monkeypatch.setattr(ytmusic_service, "search_all", lambda query: dict(SEARCH_RESULTS))
    resp = client.get("/api/v1/search/history")
    assert resp.status_code in (401, 403)
