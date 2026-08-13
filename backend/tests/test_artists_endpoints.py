from sqlalchemy.orm import Session

from app.db.models.artist import ArtistModel
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.song import SongModel
from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.artist import ArtistService
from app.services.history import HistoryService
from app.services.songs import SongService


def make_artist(db: Session, name: str) -> ArtistModel:
    return ArtistService.get_or_create_artist(db, name)


def register_artist_via_plays(
    db: Session, user_id: str, uploader: str, *, plays: int = 3
) -> None:
    for i in range(plays):
        HistoryService.record_listen(
            db,
            user_id=user_id,
            data=HistoryRecordCreate(
                song=Song(
                    id=f"{uploader.lower().replace(' ', '-')}-{i}",
                    title=f"Track {i}",
                    uploader=uploader,
                    thumbnail="",
                ),
            ),
        )


def test_list_artists(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    make_artist(db, "Radiohead")
    make_artist(db, "Coldplay")
    register_artist_via_plays(db, test_user.id, "Radiohead")
    register_artist_via_plays(db, test_user.id, "Coldplay")

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert {a["name"] for a in data["items"]} == {"Radiohead", "Coldplay"}


def test_list_artists_excludes_unplayed(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    make_artist(db, "Radiohead")
    make_artist(db, "Coldplay")

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_artist_registered_after_three_plays(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    make_artist(db, "Radiohead")

    for i in range(2):
        HistoryService.record_listen(
            db,
            user_id=test_user.id,
            data=HistoryRecordCreate(
                song=Song(
                    id=f"vid{i}",
                    title=f"Creep {i}",
                    uploader="Radiohead",
                    thumbnail="",
                ),
            ),
        )

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.json()["total"] == 0

    HistoryService.record_listen(
        db,
        user_id=test_user.id,
        data=HistoryRecordCreate(
            song=Song(id="vid3", title="Creep 3", uploader="Radiohead", thumbnail="")
        ),
    )

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Radiohead"


def test_playback_state_sync_does_not_create_artists(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    state = {
        "last_song_id": "search-hit-1",
        "current_queue": [
            {
                "id": f"search-hit-{i}",
                "title": f"Result {i}",
                "uploader": f"Channel {i}",
                "thumbnail": "t",
            }
            for i in range(4)
        ],
        "recent_songs": [],
    }
    response = client.post("/api/v1/state/", json=state, headers=auth_headers)
    assert response.status_code == 200

    assert db.query(ArtistModel).count() == 0

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_get_artist_by_slug(client, db: Session, auth_headers: dict[str, str]) -> None:
    make_artist(db, "Radiohead")
    db_song = SongService.upsert_song(
        db,
        Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail=""),
    )
    ArtistService.sync_song_artists(db, db_song)

    response = client.get("/api/v1/artists/radiohead", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Radiohead"
    assert [s["id"] for s in data["songs"]] == ["vid1"]


def test_get_artist_by_slug_falls_back_to_song_thumbnail(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    make_artist(db, "Radiohead")
    db_song = SongService.upsert_song(
        db,
        Song(
            id="vid1",
            title="Creep",
            uploader="Radiohead",
            thumbnail="https://i.ytimg.com/vi/vid1/hqdefault.jpg",
        ),
    )
    ArtistService.sync_song_artists(db, db_song)

    response = client.get("/api/v1/artists/radiohead", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["thumbnail_url"] == "https://i.ytimg.com/vi/vid1/hqdefault.jpg"


def test_get_artist_by_slug_keeps_own_thumbnail(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    artist = make_artist(db, "Radiohead")
    artist.thumbnail_url = "https://yt3.googleusercontent.com/radiohead-avatar"
    db.commit()
    db_song = SongService.upsert_song(
        db,
        Song(
            id="vid1",
            title="Creep",
            uploader="Radiohead",
            thumbnail="https://i.ytimg.com/vi/vid1/hqdefault.jpg",
        ),
    )
    ArtistService.sync_song_artists(db, db_song)

    response = client.get("/api/v1/artists/radiohead", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["thumbnail_url"] == "https://yt3.googleusercontent.com/radiohead-avatar"


def test_get_artist_not_found(client, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/artists/nope", headers=auth_headers)
    assert response.status_code == 404


def test_artist_songs(client, db: Session, auth_headers: dict[str, str]) -> None:
    make_artist(db, "Radiohead")
    db_song = SongService.upsert_song(
        db,
        Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail=""),
    )
    ArtistService.sync_song_artists(db, db_song)

    response = client.get("/api/v1/artists/radiohead/songs", headers=auth_headers)
    assert response.status_code == 200
    assert [s["id"] for s in response.json()] == ["vid1"]


def test_toggle_follow(client, db: Session, auth_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")

    response = client.post(f"/api/v1/artists/{artist.id}/follow", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"is_following": True, "follower_count": 1}

    response = client.post(f"/api/v1/artists/{artist.id}/follow", headers=auth_headers)
    assert response.json() == {"is_following": False, "follower_count": 0}


def test_following_artists(client, db: Session, auth_headers: dict[str, str]) -> None:
    artist = make_artist(db, "Radiohead")
    client.post(f"/api/v1/artists/{artist.id}/follow", headers=auth_headers)

    response = client.get("/api/v1/artists/following", headers=auth_headers)
    assert response.status_code == 200
    assert [a["name"] for a in response.json()] == ["Radiohead"]


def test_following_artists_search_and_source_filter(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    radiohead = make_artist(db, "Radiohead")
    daft = ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id="UC" + "A" * 22
    )
    for artist in (radiohead, daft):
        client.post(f"/api/v1/artists/{artist.id}/follow", headers=auth_headers)

    response = client.get(
        "/api/v1/artists/following?source=youtube", headers=auth_headers
    )
    assert [a["name"] for a in response.json()] == ["Daft Punk"]

    response = client.get(
        "/api/v1/artists/following?source=platform", headers=auth_headers
    )
    assert [a["name"] for a in response.json()] == ["Radiohead"]

    response = client.get("/api/v1/artists/following?search=daft", headers=auth_headers)
    assert [a["name"] for a in response.json()] == ["Daft Punk"]


def test_list_artists_source_youtube(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    make_artist(db, "Radiohead")
    ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id="UC" + "A" * 22
    )

    response = client.get("/api/v1/artists/?source=youtube", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert [a["name"] for a in data["items"]] == ["Daft Punk"]


def test_serialize_exposes_is_from_youtube(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    radiohead = make_artist(db, "Radiohead")
    client.post(f"/api/v1/artists/{radiohead.id}/follow", headers=auth_headers)
    ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id="UC" + "A" * 22
    )

    response = client.get("/api/v1/artists/", headers=auth_headers)
    assert response.status_code == 200
    by_name = {a["name"]: a for a in response.json()["items"]}
    assert by_name["Radiohead"]["is_from_youtube"] is False
    assert by_name["Daft Punk"]["is_from_youtube"] is True

    detail = client.get("/api/v1/artists/daft-punk", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["is_from_youtube"] is True


def test_featured_artists(
    client,
    db: Session,
    auth_headers: dict[str, str],
    test_user,
) -> None:
    popular = ArtistService.get_or_create_artist(
        db, "Popular One", youtube_channel_id="UC" + "B" * 22
    )
    popular.monthly_listeners = 1_000_000
    db.commit()

    top_artist = make_artist(db, "Top Artist")
    for i in range(3):
        HistoryService.record_listen(
            db,
            user_id=test_user.id,
            data=HistoryRecordCreate(
                song=Song(
                    id=f"top-song-{i}",
                    title=f"Hit {i}",
                    uploader="Top Artist",
                    thumbnail="",
                    duration=200,
                ),
            ),
        )
    assert top_artist.name

    followed = make_artist(db, "Followed One")
    followed.follower_count = 999
    db.commit()
    client.post(f"/api/v1/artists/{followed.id}/follow", headers=auth_headers)

    ArtistService.get_or_create_artist(
        db, "Recent One", youtube_channel_id="UC" + "C" * 22
    )

    response = client.get("/api/v1/artists/featured", headers=auth_headers)
    assert response.status_code == 200
    sections = response.json()["sections"]
    assert [s["key"] for s in sections] == [
        "popular",
        "top",
        "most_followed",
        "recent",
    ]
    by_key = {s["key"]: s for s in sections}
    assert by_key["popular"]["items"][0]["name"] == "Popular One"
    assert [i["name"] for i in by_key["top"]["items"]] == ["Top Artist"]
    assert by_key["top"]["items"][0]["play_count"] == 3
    assert by_key["most_followed"]["items"][0]["name"] == "Followed One"
    assert by_key["recent"]["items"][0]["name"] == "Recent One"


def test_featured_artists_excludes_unmatched_history(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    song = SongModel(
        id="ghost-song", title="Ghost", uploader="No Local Artist", thumbnail=""
    )
    db.add(song)
    db.add(
        ListeningHistoryModel(user_id=test_user.id, song_id=song.id, play_duration=10)
    )
    db.commit()

    response = client.get("/api/v1/artists/featured", headers=auth_headers)
    assert response.status_code == 200
    assert all(s["key"] != "top" for s in response.json()["sections"])


def test_featured_artists_requires_auth(client) -> None:
    response = client.get("/api/v1/artists/featured")
    assert response.status_code == 401


def test_featured_suggested_artists(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    played = make_artist(db, "Played Rock Band")
    played.genres = ["Rock"]
    db.commit()
    register_artist_via_plays(db, test_user.id, "Played Rock Band")

    suggested = make_artist(db, "Fresh Rock Band")
    suggested.genres = ["Rock", "Indie"]
    suggested.monthly_listeners = 5_000_000
    db.commit()

    make_artist(db, "Country Star").genres = ["Country"]
    db.commit()

    response = client.get("/api/v1/artists/featured", headers=auth_headers)
    assert response.status_code == 200
    sections = response.json()["sections"]
    by_key = {s["key"]: s for s in sections}

    assert sections[0]["key"] == "suggested"
    items = by_key["suggested"]["items"]
    assert [i["name"] for i in items] == ["Fresh Rock Band"]
    assert items[0]["reason"] == "Because you listen to Rock"


def test_get_suggested_artists(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    played = make_artist(db, "Played Rock Band")
    played.genres = ["Rock"]
    db.commit()
    register_artist_via_plays(db, test_user.id, "Played Rock Band")

    suggested = make_artist(db, "Fresh Rock Band")
    suggested.genres = ["Rock"]
    db.commit()

    response = client.get("/api/v1/artists/suggested", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    items = data["items"]
    assert [i["name"] for i in items] == ["Fresh Rock Band"]
    assert items[0]["reason"] == "Because you listen to Rock"


def test_get_suggested_artists_paginates(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    played = make_artist(db, "Played Rock Band")
    played.genres = ["Rock"]
    db.commit()
    register_artist_via_plays(db, test_user.id, "Played Rock Band")

    for name in ["Suggestion One", "Suggestion Two", "Suggestion Three"]:
        make_artist(db, name).genres = ["Rock"]
    db.commit()

    first = client.get(
        "/api/v1/artists/suggested?page=1&page_size=2", headers=auth_headers
    )
    assert first.status_code == 200
    assert first.json()["total"] == 3
    assert len(first.json()["items"]) == 2

    second = client.get(
        "/api/v1/artists/suggested?page=2&page_size=2", headers=auth_headers
    )
    assert second.status_code == 200
    assert len(second.json()["items"]) == 1


def test_get_suggested_artists_requires_auth(client) -> None:
    response = client.get("/api/v1/artists/suggested")
    assert response.status_code == 401


def test_ytmusic_artist_content_served_from_store(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    db_artist = make_artist(db, "YT Music Artist")
    db_artist.external_ids = {
        **db_artist.external_ids,
        "youtube_channel_id": "UC1234567890123456789012",
    }
    db_artist.channel_metadata = {
        "ytmusic_albums": [
            {
                "id": "MPREb_1",
                "name": "Album One",
                "year": "2024",
                "cover_image_url": "http://img/1",
                "track_ids": ["vid1", "vid2"],
            },
            {
                "id": "MPREb_2",
                "name": "Album Two",
                "year": "2023",
                "cover_image_url": None,
                "track_ids": ["vid3"],
            },
        ]
    }
    db.commit()
    for vid, title in [("vid1", "Song 1"), ("vid2", "Song 2"), ("vid3", "Song 3")]:
        db_song = SongService.upsert_song(
            db,
            Song(id=vid, title=title, uploader="YT Music Artist", thumbnail=""),
        )
        ArtistService.sync_song_artists(db, db_song)

    albums_response = client.get(
        f"/api/v1/artists/{db_artist.slug}/albums", headers=auth_headers
    )
    assert albums_response.status_code == 200
    albums = albums_response.json()["albums"]
    assert [a["name"] for a in albums] == ["Album One", "Album Two"]
    assert [s["id"] for s in albums[0]["songs"]] == ["vid1", "vid2"]
    assert albums[0]["cover_image_url"] == "http://img/1"
    assert [s["id"] for s in albums[1]["songs"]] == ["vid3"]

    songs_response = client.get(
        f"/api/v1/artists/{db_artist.slug}/songs", headers=auth_headers
    )
    assert songs_response.status_code == 200
    assert {s["id"] for s in songs_response.json()} == {"vid1", "vid2", "vid3"}


def test_featured_suggested_excludes_followed(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    register_artist_via_plays(db, test_user.id, "Played Rock Band")
    played = ArtistService.get_or_create_artist(db, "Played Rock Band")
    played.genres = ["Rock"]
    db.commit()

    followed = make_artist(db, "Followed Rock Band")
    followed.genres = ["Rock"]
    db.commit()
    client.post(f"/api/v1/artists/{followed.id}/follow", headers=auth_headers)

    response = client.get("/api/v1/artists/featured", headers=auth_headers)
    assert response.status_code == 200
    by_key = {s["key"]: s for s in response.json()["sections"]}
    if "suggested" in by_key:
        assert by_key["suggested"]["items"] == []


def test_featured_suggested_needs_history(
    client, db: Session, auth_headers: dict[str, str]
) -> None:
    make_artist(db, "Fresh Rock Band").genres = ["Rock"]
    db.commit()

    response = client.get("/api/v1/artists/featured", headers=auth_headers)
    assert response.status_code == 200
    assert all(s["key"] != "suggested" for s in response.json()["sections"])


def test_artist_recently_played(
    client, db: Session, auth_headers: dict[str, str], test_user
) -> None:
    make_artist(db, "Radiohead")
    db_song = SongService.upsert_song(
        db,
        Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail=""),
    )
    ArtistService.sync_song_artists(db, db_song)
    HistoryService.record_listen(
        db,
        user_id=test_user.id,
        data=HistoryRecordCreate(
            song=Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail=""),
            play_duration=30,
        ),
    )

    response = client.get(
        "/api/v1/artists/radiohead/recently-played", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert [s["id"] for s in data] == ["vid1"]
    assert data[0]["title"] == "Creep"
    assert data[0]["played_at"] is not None


def test_artist_recently_played_not_found(client, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/artists/nope/recently-played", headers=auth_headers)
    assert response.status_code == 404


def test_artist_recently_played_requires_auth(client, db: Session) -> None:
    make_artist(db, "Radiohead")
    response = client.get("/api/v1/artists/radiohead/recently-played")
    assert response.status_code == 401
