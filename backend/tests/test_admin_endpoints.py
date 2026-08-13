from typing import Any, Callable

from sqlalchemy.orm import Session

from app.db.models.artist import ArtistModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel, UserRole
from app.services.admin import AdminService
from app.services.artist import ArtistService
from app.services.songs import SongService


def make_artist(db: Session, name: str) -> ArtistModel:
    return ArtistService.get_or_create_artist(db, name)


def make_song(db: Session, song_id: str, uploader: str) -> SongModel:
    from app.schemas.song import Song

    return SongService.upsert_song(
        db,
        Song(id=song_id, title=song_id, uploader=uploader, thumbnail="", duration=100),
    )


# ------------------------------------------------------------------ #
# Dashboard
# ------------------------------------------------------------------ #
def test_dashboard_metrics(client, db: Session, admin_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    artist.is_published = False
    make_song(db, "song-a", "Radiohead")
    db.commit()

    response = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["artists_total"] == 1
    assert data["artists_hidden"] == 1
    assert data["songs_total"] == 1
    assert data["songs_published"] == 1
    assert data["users_total"] >= 1


def test_dashboard_requires_admin(client, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/admin/dashboard", headers=auth_headers)
    assert response.status_code == 403


# ------------------------------------------------------------------ #
# Artists
# ------------------------------------------------------------------ #
def test_list_artists_includes_hidden(client, db: Session, admin_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    artist.is_published = False
    db.commit()

    response = client.get("/api/v1/admin/artists", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["is_published"] is False

    response = client.get(
        "/api/v1/admin/artists?published=false", headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_update_artist_metadata(client, db: Session, admin_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    response = client.patch(
        f"/api/v1/admin/artists/{artist.id}",
        headers=admin_headers,
        json={"bio": "English rock band", "genres": ["rock"]},
    )
    assert response.status_code == 200
    assert response.json()["bio"] == "English rock band"
    assert response.json()["genres"] == ["rock"]


def test_feature_and_hide_artist(client, db: Session, admin_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    db.commit()

    r = client.post(f"/api/v1/admin/artists/{artist.id}/feature", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["is_featured"] is True

    r = client.post(f"/api/v1/admin/artists/{artist.id}/hide", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["is_published"] is False

    r = client.post(f"/api/v1/admin/artists/{artist.id}/publish", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["is_published"] is True


def test_delete_artist(client, db: Session, admin_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    artist_id = artist.id
    response = client.delete(
        f"/api/v1/admin/artists/{artist_id}", headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["deleted"] is True
    assert db.query(ArtistModel).filter(ArtistModel.id == artist_id).first() is None


def test_artists_require_admin(client, db: Session, auth_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    response = client.patch(
        f"/api/v1/admin/artists/{artist.id}",
        headers=auth_headers,
        json={"bio": "x"},
    )
    assert response.status_code == 403


# ------------------------------------------------------------------ #
# Batch import
# ------------------------------------------------------------------ #
def test_batch_import_aggregates_results(
    client, db: Session, admin_headers: dict[str, str], monkeypatch
) -> None:
    def fake_import_one(item: str, *, thumbnail: str | None) -> dict[str, Any]:
        if item == "fail":
            return {"input": item, "status": "failed", "message": "Import failed"}
        return {"input": item, "status": "imported", "name": item, "channel_id": "UC" + item}

    monkeypatch.setattr(AdminService, "_import_one_artist", fake_import_one)
    response = client.post(
        "/api/v1/admin/artists/batch-import",
        headers=admin_headers,
        json={"items": ["A", "fail", "B"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["imported"] == 2
    assert data["failed"] == 1


def test_batch_import_requires_admin(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/admin/artists/batch-import",
        headers=auth_headers,
        json={"items": ["Radiohead"]},
    )
    assert response.status_code == 403


def test_resolve_channel_direct_id(monkeypatch) -> None:
    fake_metadata = lambda channel_id: {"name": "Daft Punk"}  # noqa: E731
    monkeypatch.setattr(
        "app.services.admin.youtube_service.get_channel_metadata", fake_metadata
    )
    channel_id, name = AdminService._resolve_channel("UC1234567890123456789012")
    assert channel_id == "UC1234567890123456789012"
    assert name == "Daft Punk"


def test_resolve_channel_by_search(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.admin.youtube_service.search_artists",
        lambda query, limit=1: [
            {
                "channel_id": "UCabc",
                "name": "Daft Punk",
                "thumbnail": "",
                "subscribers": 100,
                "url": "https://youtube.com/channel/UCabc",
            }
        ],
    )
    channel_id, name = AdminService._resolve_channel("daft punk")
    assert channel_id == "UCabc"
    assert name == "Daft Punk"


def test_import_one_artist_already_exists(
    db: Session, monkeypatch
) -> None:
    channel_id = "UC" + "a" * 22
    ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id=channel_id
    )
    db.commit()
    monkeypatch.setattr(
        "app.services.admin.SessionLocal",
        lambda: db,
    )
    monkeypatch.setattr(
        AdminService,
        "_resolve_channel",
        lambda item: (channel_id, "Daft Punk"),
    )
    result = AdminService._import_one_artist(
        "Daft Punk", thumbnail=None
    )
    assert result["status"] == "already_exists"


def test_import_one_artist_imports(monkeypatch) -> None:
    class _FakeDB:
        def __enter__(self) -> "_FakeDB":
            return self

        def __exit__(self, *args: Any) -> None:
            return None

        def close(self) -> None:
            return None

    fake_db = _FakeDB()
    monkeypatch.setattr("app.services.admin.SessionLocal", lambda: fake_db)
    monkeypatch.setattr(
        AdminService,
        "_resolve_channel",
        lambda item: ("UCnew", "Daft Punk"),
    )
    monkeypatch.setattr(
        "app.services.admin.YouTubeChannelService.find_by_channel_id",
        lambda db, channel_id: None,
    )
    monkeypatch.setattr(
        "app.services.admin.YouTubeArtistService.import_artist",
        lambda db, data: {"slug": "daft-punk", "id": "x"},
    )

    result = AdminService._import_one_artist("daft punk", thumbnail=None)
    assert result["status"] == "imported"


# ------------------------------------------------------------------ #
# Songs
# ------------------------------------------------------------------ #
def test_list_songs_and_import(
    client, db: Session, admin_headers: dict[str, str], monkeypatch
) -> None:
    make_song(db, "song-1", "Radiohead")
    db.commit()

    response = client.get("/api/v1/admin/songs", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 1

    monkeypatch.setattr(
        "app.services.admin.youtube_service.extract_playlist_info",
        lambda url: [
            {
                "id": "new-song",
                "title": "New Song",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 200,
            }
        ],
    )
    response = client.post(
        "/api/v1/admin/songs/import",
        headers=admin_headers,
        json={"url": "https://www.youtube.com/watch?v=newsong12345"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == "new-song"
    assert response.json()["imported"] is True


def test_song_feature_hide_delete(
    client, db: Session, admin_headers: dict[str, str]
) -> None:
    song = make_song(db, "song-1", "Radiohead")
    db.commit()

    assert client.post(
        f"/api/v1/admin/songs/{song.id}/feature", headers=admin_headers
    ).json()["is_featured"] is True
    assert client.post(
        f"/api/v1/admin/songs/{song.id}/hide", headers=admin_headers
    ).json()["is_published"] is False
    assert client.post(
        f"/api/v1/admin/songs/{song.id}/publish", headers=admin_headers
    ).json()["is_published"] is True
    assert client.delete(
        f"/api/v1/admin/songs/{song.id}", headers=admin_headers
    ).json()["deleted"] is True
    assert db.query(SongModel).filter(SongModel.id == song.id).first() is None


def test_song_import_invalid_url(client, db: Session, admin_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/admin/songs/import",
        headers=admin_headers,
        json={"url": "not-a-url"},
    )
    assert response.status_code == 400


# ------------------------------------------------------------------ #
# Playlist -> catalog import
# ------------------------------------------------------------------ #
def test_import_playlist_to_catalog(
    client, db: Session, admin_headers: dict[str, str], monkeypatch
) -> None:
    make_song(db, "existing-song", "Radiohead")
    db.commit()

    monkeypatch.setattr(
        "app.services.admin.youtube_service.extract_playlist_info",
        lambda url: [
            {"id": "existing-song", "title": "Old", "uploader": "Radiohead",
             "thumbnail": "", "duration": 100},
            {"id": "song-new", "title": "New", "uploader": "Coldplay",
             "thumbnail": "", "duration": 120},
        ],
    )
    response = client.post(
        "/api/v1/admin/playlists/import",
        headers=admin_headers,
        json={"url": "https://www.youtube.com/playlist?list=PLx"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["imported"] == 1
    assert data["skipped_existing"] == 1
    assert db.query(SongModel).filter(SongModel.id == "song-new").first() is not None


# ------------------------------------------------------------------ #
# Users
# ------------------------------------------------------------------ #
def test_update_user_role_and_active(
    client, db: Session, admin_headers: dict[str, str]
) -> None:
    user = UserModel(
        id="user-x",
        email="userx@example.com",
        username="userx",
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()

    response = client.patch(
        f"/api/v1/admin/users/{user.id}",
        headers=admin_headers,
        json={"role": "admin"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"

    response = client.patch(
        f"/api/v1/admin/users/{user.id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_cannot_demote_self(client, db: Session, admin_headers: dict[str, str], admin_user) -> None:
    response = client.patch(
        f"/api/v1/admin/users/{admin_user.id}",
        headers=admin_headers,
        json={"role": "user"},
    )
    assert response.status_code == 400


def test_invalid_role_rejected(client, db: Session, admin_headers: dict[str, str], test_user) -> None:
    response = client.patch(
        f"/api/v1/admin/users/{test_user.id}",
        headers=admin_headers,
        json={"role": "superuser"},
    )
    assert response.status_code == 400


# ------------------------------------------------------------------ #
# Curation: users only see published content
# ------------------------------------------------------------------ #
def test_hidden_artist_hidden_from_user_browse(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    artist = make_artist(db, "Radiohead")
    artist.is_published = False
    db.commit()

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_hidden_artist_detail_404_for_user_200_for_admin(
    client, db: Session, auth_headers: dict[str, str], admin_headers: dict[str, str]
) -> None:
    artist = make_artist(db, "Radiohead")
    artist.is_published = False
    db.commit()

    user_resp = client.get(f"/api/v1/artists/{artist.slug}", headers=auth_headers)
    assert user_resp.status_code == 404

    admin_resp = client.get(f"/api/v1/artists/{artist.slug}", headers=admin_headers)
    assert admin_resp.status_code == 200


def test_unpublished_song_excluded_from_related(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    make_song(db, "song-1", "Radiohead")
    hidden = make_song(db, "song-2", "Radiohead")
    hidden.is_published = False
    db.commit()

    response = client.get("/api/v1/songs/song-1/related", headers=auth_headers)
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert "song-2" not in ids


def test_artist_songs_exclude_unpublished(client, db: Session, auth_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    make_song(db, "song-1", "Radiohead")
    hidden = make_song(db, "song-2", "Radiohead")
    hidden.is_published = False
    artist.songs.extend([db.get(SongModel, "song-1"), hidden])
    db.commit()

    response = client.get(f"/api/v1/artists/{artist.slug}/songs", headers=auth_headers)
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert ids == {"song-1"}
