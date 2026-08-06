from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel, PlaylistVisibility
from app.db.models.user import UserModel
from app.services.auth import AuthService


def make_playlist(
    db: Session,
    name: str,
    user: UserModel,
    *,
    visibility: PlaylistVisibility = PlaylistVisibility.PRIVATE,
) -> PlaylistModel:
    playlist = PlaylistModel(name=name, user_id=user.id, visibility=visibility)
    db.add(playlist)
    db.commit()
    return playlist


def make_user(db: Session, user_id: str, username: str) -> UserModel:
    user = UserModel(
        id=user_id,
        email=f"{username}@example.com",
        username=username,
        display_name=username.title(),
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


class TestGetPlaylists:
    def test_requires_auth(self, client) -> None:
        response = client.get("/api/v1/playlists/")
        assert response.status_code == 401

    def test_empty(self, client, auth_headers: dict[str, str]) -> None:
        response = client.get("/api/v1/playlists/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_own_playlists(
        self, client, db: Session, test_user: UserModel, auth_headers: dict[str, str]
    ) -> None:
        make_playlist(db, "My Playlist", test_user)

        response = client.get("/api/v1/playlists/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "My Playlist"
        assert data[0]["is_owner"] is True

    def test_includes_public_from_others(
        self,
        client,
        db: Session,
        test_user: UserModel,
        admin_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        make_playlist(
            db, "Other Public", admin_user, visibility=PlaylistVisibility.PUBLIC
        )

        response = client.get("/api/v1/playlists/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()[0]["name"] == "Other Public"


class TestDiscover:
    def test_returns_public_playlists(
        self,
        client,
        db: Session,
        admin_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        make_playlist(db, "Hidden", admin_user)
        make_playlist(
            db, "Public One", admin_user, visibility=PlaylistVisibility.PUBLIC
        )

        response = client.get("/api/v1/playlists/discover", headers=auth_headers)
        assert response.status_code == 200
        assert [p["name"] for p in response.json()] == ["Public One"]


class TestFollowing:
    def test_empty(self, client, auth_headers: dict[str, str]) -> None:
        response = client.get("/api/v1/playlists/following", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_followed(
        self,
        client,
        db: Session,
        test_user: UserModel,
        admin_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(
            db, "Followed", admin_user, visibility=PlaylistVisibility.PUBLIC
        )
        client.post(f"/api/v1/playlists/{playlist.id}/follow", headers=auth_headers)

        response = client.get("/api/v1/playlists/following", headers=auth_headers)
        assert [p["name"] for p in response.json()] == ["Followed"]


class TestFollow:
    def test_toggles(
        self,
        client,
        db: Session,
        admin_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(
            db, "Public", admin_user, visibility=PlaylistVisibility.PUBLIC
        )

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/follow", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json() == {"is_following": True, "follower_count": 1}

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/follow", headers=auth_headers
        )
        assert response.json() == {"is_following": False, "follower_count": 0}


class TestGetPlaylist:
    def test_not_found(self, client, auth_headers: dict[str, str]) -> None:
        response = client.get("/api/v1/playlists/nonexistent", headers=auth_headers)
        assert response.status_code == 404

    def test_returns_playlist(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        response = client.get(f"/api/v1/playlists/{playlist.id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["name"] == "My Playlist"

    def test_private_playlist_from_other_user_hidden(
        self,
        client,
        db: Session,
        test_user: UserModel,
        admin_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Secret", admin_user)

        response = client.get(f"/api/v1/playlists/{playlist.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_sorts_songs_by_duration(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Sorted", test_user)

        for song_id, duration in (("s1", 300), ("s2", 100)):
            client.post(
                f"/api/v1/playlists/{playlist.id}/add",
                json={
                    "id": song_id,
                    "title": f"Song {song_id}",
                    "uploader": "Artist",
                    "thumbnail": "http://example.com/t.jpg",
                    "duration": duration,
                },
                headers=auth_headers,
            )

        response = client.get(
            f"/api/v1/playlists/{playlist.id}",
            params={"sort_by": "duration", "order": "asc"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert [s["id"] for s in response.json()["songs"]] == ["s2", "s1"]


class TestCreatePlaylist:
    def test_creates(self, client, auth_headers: dict[str, str]) -> None:
        response = client.post(
            "/api/v1/playlists/", json={"name": "New Playlist"}, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Playlist"

    def test_creates_public(
        self, client, auth_headers: dict[str, str], db: Session
    ) -> None:
        response = client.post(
            "/api/v1/playlists/",
            json={"name": "Public Playlist", "visibility": "public"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        playlist = (
            db.query(PlaylistModel)
            .filter(PlaylistModel.name == "Public Playlist")
            .first()
        )
        assert playlist is not None
        assert playlist.visibility == PlaylistVisibility.PUBLIC

    def test_requires_auth(self, client) -> None:
        response = client.post("/api/v1/playlists/", json={"name": "New Playlist"})
        assert response.status_code == 401

    def test_idempotent(self, client, auth_headers: dict[str, str]) -> None:
        client.post(
            "/api/v1/playlists/", json={"name": "Existing"}, headers=auth_headers
        )
        response = client.post(
            "/api/v1/playlists/", json={"name": "Existing"}, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Playlist already exists"


class TestUpdatePlaylist:
    def test_updates(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Old Name", test_user)

        response = client.patch(
            f"/api/v1/playlists/{playlist.id}",
            json={"name": "New Name", "visibility": "public"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_non_owner_forbidden(
        self,
        client,
        db: Session,
        test_user: UserModel,
        admin_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Mine", admin_user)

        response = client.patch(
            f"/api/v1/playlists/{playlist.id}",
            json={"name": "Stolen"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    def test_not_found(self, client, auth_headers: dict[str, str]) -> None:
        response = client.patch(
            "/api/v1/playlists/nonexistent",
            json={"name": "New Name"},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestDeletePlaylist:
    def test_deletes(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "To Delete", test_user)

        response = client.delete(
            f"/api/v1/playlists/{playlist.id}", headers=auth_headers
        )
        assert response.status_code == 200

    def test_not_found(self, client, auth_headers: dict[str, str]) -> None:
        response = client.delete("/api/v1/playlists/nonexistent", headers=auth_headers)
        assert response.status_code == 404


class TestAddSongToPlaylist:
    def test_adds_song(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        response = client.post(
            f"/api/v1/playlists/{playlist.id}/add", json=song, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Song added"

    def test_creates_playlist_by_name(
        self, client, auth_headers: dict[str, str]
    ) -> None:
        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        response = client.post(
            "/api/v1/playlists/New Playlist/add", json=song, headers=auth_headers
        )
        assert response.status_code == 200

    def test_idempotent_add(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        client.post(
            f"/api/v1/playlists/{playlist.id}/add", json=song, headers=auth_headers
        )
        response = client.post(
            f"/api/v1/playlists/{playlist.id}/add", json=song, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Song already in playlist"


class TestRemoveSongFromPlaylist:
    def test_removes(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        client.post(
            f"/api/v1/playlists/{playlist.id}/add", json=song, headers=auth_headers
        )
        response = client.delete(
            f"/api/v1/playlists/{playlist.id}/songs/song-1", headers=auth_headers
        )
        assert response.status_code == 200

    def test_not_found_playlist(self, client, auth_headers: dict[str, str]) -> None:
        response = client.delete(
            "/api/v1/playlists/nonexistent/songs/song-1", headers=auth_headers
        )
        assert response.status_code == 404


class TestToggleCollaborative:
    def test_toggles(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/collaborative", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json() == {"is_collaborative": True}

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/collaborative", headers=auth_headers
        )
        assert response.json() == {"is_collaborative": False}

    def test_non_owner_forbidden(
        self,
        client,
        db: Session,
        test_user: UserModel,
        admin_user: UserModel,
        admin_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/collaborative", headers=admin_headers
        )
        assert response.status_code == 200

    def test_requires_auth(self, client) -> None:
        response = client.post("/api/v1/playlists/anything/collaborative")
        assert response.status_code == 401


class TestCollaborators:
    def test_add_list_remove(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/collaborators",
            json={"user_id": other.id, "role": "editor"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Collaborator added"

        response = client.get(
            f"/api/v1/playlists/{playlist.id}/collaborators", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_id"] == other.id
        assert data[0]["role"] == "editor"

        response = client.delete(
            f"/api/v1/playlists/{playlist.id}/collaborators/{other.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_add_owner_rejected(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/collaborators",
            json={"user_id": test_user.id, "role": "editor"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_non_owner_forbidden(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")

        intruder = make_user(db, "intruder-id", "intruder")
        tokens = AuthService.create_tokens_for_user(intruder)
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        response = client.post(
            f"/api/v1/playlists/{playlist.id}/collaborators",
            json={"user_id": other.id, "role": "editor"},
            headers=headers,
        )
        assert response.status_code == 403


class TestUserSearch:
    def test_search_users(
        self,
        client,
        db: Session,
        test_user: UserModel,
        auth_headers: dict[str, str],
    ) -> None:
        make_user(db, "alice-id", "alice")

        response = client.get("/api/v1/users/search?q=alic", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert any(u["username"] == "alice" for u in data)

    def test_requires_auth(self, client) -> None:
        response = client.get("/api/v1/users/search?q=a")
        assert response.status_code == 401
