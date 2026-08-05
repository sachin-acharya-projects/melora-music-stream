from sqlalchemy.orm import Session

from app.db.models.user import UserModel, UserRole
from app.services.auth import AuthService


class TestGetPlaybackState:
    def test_unauthenticated(self, client) -> None:
        response = client.get("/api/v1/state/")
        assert response.status_code == 401

    def test_returns_empty_state(
        self, client, test_user: UserModel, auth_headers: dict
    ) -> None:
        response = client.get("/api/v1/state/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["last_song_id"] is None
        assert data["current_queue"] == []
        assert data["recent_songs"] == []


class TestUpdatePlaybackState:
    def test_unauthenticated(self, client) -> None:
        response = client.post("/api/v1/state/", json={})
        assert response.status_code == 401

    def test_creates_state(
        self, client, test_user: UserModel, auth_headers: dict
    ) -> None:
        state = {
            "last_song_id": "song-1",
            "current_queue": [
                {"id": "song-1", "title": "Song 1", "uploader": "A", "thumbnail": "t"}
            ],
            "recent_songs": [],
            "last_playlist_id": "playlist-1",
        }
        response = client.post("/api/v1/state/", json=state, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Playback state updated"

        # Verify it was saved
        response = client.get("/api/v1/state/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["last_song_id"] == "song-1"
        assert len(data["current_queue"]) == 1
        assert data["current_queue"][0]["id"] == "song-1"

    def test_updates_existing_state(
        self, client, test_user: UserModel, auth_headers: dict
    ) -> None:
        state1 = {
            "last_song_id": "song-1",
            "current_queue": [
                {"id": "song-1", "title": "Song 1", "uploader": "A", "thumbnail": "t"}
            ],
        }
        client.post("/api/v1/state/", json=state1, headers=auth_headers)

        state2 = {
            "last_song_id": "song-2",
            "current_queue": [
                {"id": "song-2", "title": "Song 2", "uploader": "B", "thumbnail": "t"}
            ],
            "recent_songs": [
                {"id": "song-1", "title": "Song 1", "uploader": "A", "thumbnail": "t"}
            ],
        }
        response = client.post("/api/v1/state/", json=state2, headers=auth_headers)
        assert response.status_code == 200

        response = client.get("/api/v1/state/", headers=auth_headers)
        data = response.json()
        assert data["last_song_id"] == "song-2"
        assert len(data["recent_songs"]) == 1

    def test_per_user_isolation(
        self, client, test_user: UserModel, auth_headers: dict, db: Session
    ) -> None:
        user2 = UserModel(
            id="user-2",
            email="user2@example.com",
            username="user2",
            role=UserRole.USER,
            is_active=True,
        )
        db.add(user2)
        db.commit()

        tokens2 = AuthService.create_tokens_for_user(user2)
        headers2 = {"Authorization": f"Bearer {tokens2['access_token']}"}

        state1 = {"last_song_id": "song-1"}
        state2 = {"last_song_id": "song-2"}

        client.post("/api/v1/state/", json=state1, headers=auth_headers)
        client.post("/api/v1/state/", json=state2, headers=headers2)

        r1 = client.get("/api/v1/state/", headers=auth_headers)
        r2 = client.get("/api/v1/state/", headers=headers2)

        assert r1.json()["last_song_id"] == "song-1"
        assert r2.json()["last_song_id"] == "song-2"
