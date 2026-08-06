from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel


class TestGetPlaylists:
    def test_empty(self, client) -> None:
        response = client.get("/api/v1/playlists/")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_playlists(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        response = client.get("/api/v1/playlists/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "My Playlist"


class TestGetPlaylist:
    def test_not_found(self, client) -> None:
        response = client.get("/api/v1/playlists/nonexistent")
        assert response.status_code == 404

    def test_returns_playlist(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        response = client.get(f"/api/v1/playlists/{playlist.id}")
        assert response.status_code == 200
        assert response.json()["name"] == "My Playlist"

    def test_sorts_songs_by_duration(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="Sorted")
        db.add(playlist)
        db.commit()

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
            )

        response = client.get(
            f"/api/v1/playlists/{playlist.id}",
            params={"sort_by": "duration", "order": "asc"},
        )
        assert response.status_code == 200
        assert [s["id"] for s in response.json()["songs"]] == ["s2", "s1"]


class TestCreatePlaylist:
    def test_creates(self, client) -> None:
        response = client.post("/api/v1/playlists/", json={"name": "New Playlist"})
        assert response.status_code == 200
        assert response.json()["name"] == "New Playlist"

    def test_idempotent(self, client) -> None:
        client.post("/api/v1/playlists/", json={"name": "Existing"})
        response = client.post("/api/v1/playlists/", json={"name": "Existing"})
        assert response.status_code == 200
        assert response.json()["message"] == "Playlist already exists"


class TestUpdatePlaylist:
    def test_updates(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="Old Name")
        db.add(playlist)
        db.commit()

        response = client.patch(
            f"/api/v1/playlists/{playlist.id}",
            json={"name": "New Name"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_not_found(self, client) -> None:
        response = client.patch(
            "/api/v1/playlists/nonexistent",
            json={"name": "New Name"},
        )
        assert response.status_code == 404


class TestDeletePlaylist:
    def test_deletes(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="To Delete")
        db.add(playlist)
        db.commit()

        response = client.delete(f"/api/v1/playlists/{playlist.id}")
        assert response.status_code == 200

    def test_not_found(self, client) -> None:
        response = client.delete("/api/v1/playlists/nonexistent")
        assert response.status_code == 404


class TestAddSongToPlaylist:
    def test_adds_song(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        response = client.post(f"/api/v1/playlists/{playlist.id}/add", json=song)
        assert response.status_code == 200
        assert response.json()["message"] == "Song added"

    def test_creates_playlist_by_name(self, client) -> None:
        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        response = client.post("/api/v1/playlists/New Playlist/add", json=song)
        assert response.status_code == 200

    def test_idempotent_add(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        client.post(f"/api/v1/playlists/{playlist.id}/add", json=song)
        response = client.post(f"/api/v1/playlists/{playlist.id}/add", json=song)
        assert response.status_code == 200
        assert response.json()["message"] == "Song already in playlist"


class TestRemoveSongFromPlaylist:
    def test_removes(self, client, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        song = {
            "id": "song-1",
            "title": "Test Song",
            "uploader": "Artist",
            "thumbnail": "http://example.com/t.jpg",
        }
        client.post(f"/api/v1/playlists/{playlist.id}/add", json=song)
        response = client.delete(f"/api/v1/playlists/{playlist.id}/songs/song-1")
        assert response.status_code == 200

    def test_not_found_playlist(self, client) -> None:
        response = client.delete("/api/v1/playlists/nonexistent/songs/song-1")
        assert response.status_code == 404
