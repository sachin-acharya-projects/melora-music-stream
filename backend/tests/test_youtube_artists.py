import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.artist import ArtistModel
from app.db.models.song import SongModel
from app.schemas.artist import YouTubeArtistImport
from app.services.artist import ArtistService
from app.services.youtube import youtube_service
from app.services.youtube_artist import YouTubeArtistService

CHANNEL_ONE = "UC" + "A" * 22
CHANNEL_TWO = "UC" + "B" * 22


def _channel(channel_id: str, name: str) -> dict:
    return {
        "channel_id": channel_id,
        "name": name,
        "thumbnail": f"http://example.com/{channel_id}.jpg",
        "subscribers": 1_000_000,
        "url": f"https://www.youtube.com/channel/{channel_id}",
    }


def _upload(video_id: str, title: str) -> dict:
    return {
        "id": video_id,
        "title": title,
        "uploader": "Daft Punk",
        "thumbnail": "http://example.com/thumb.jpg",
        "duration": 180,
    }


def test_is_unavailable_filters_unplayable_entries() -> None:
    assert youtube_service._is_unavailable({"availability": "private"})
    assert youtube_service._is_unavailable({"availability": "subscriber_only"})
    assert youtube_service._is_unavailable({"title": "Private video"})
    assert youtube_service._is_unavailable({"title": "[Deleted video]"})
    assert youtube_service._is_unavailable({"title": "Unavailable"})
    assert youtube_service._is_unavailable({"live_status": "is_upcoming"})
    assert youtube_service._is_unavailable({"live_status": "is_live"})
    assert not youtube_service._is_unavailable(
        {"title": "One More Time", "availability": "public"}
    )
    assert not youtube_service._is_unavailable(
        {"title": "Unlisted Music", "availability": "unlisted"}
    )


class _FakeYoutubeDL:
    def __init__(self, opts):
        self._opts = opts

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def extract_info(self, url, download=False):
        return {
            "channel": "Daft Punk",
            "entries": [
                {
                    "id": "ok-1",
                    "url": "https://youtu.be/ok-1",
                    "title": "One More Time",
                    "duration": 300,
                },
                {
                    "id": "priv-1",
                    "url": "https://youtu.be/priv-1",
                    "title": "Private video",
                    "duration": 120,
                    "availability": "private",
                },
                {
                    "id": "deleted-1",
                    "url": "https://youtu.be/deleted-1",
                    "title": "[Deleted video]",
                    "duration": 90,
                },
                {
                    "id": "live-1",
                    "url": "https://youtu.be/live-1",
                    "title": "Live concert",
                    "duration": 3600,
                    "live_status": "is_live",
                },
            ],
        }


def test_get_channel_uploads_filters_unavailable(monkeypatch) -> None:
    monkeypatch.setattr("app.services.youtube.yt_dlp.YoutubeDL", _FakeYoutubeDL)
    songs = youtube_service.get_channel_uploads("UC" + "X" * 22, limit=50)
    assert [s["id"] for s in songs] == ["ok-1"]


def test_extract_playlist_info_filters_unavailable(monkeypatch) -> None:
    monkeypatch.setattr("app.services.youtube.yt_dlp.YoutubeDL", _FakeYoutubeDL)
    songs = youtube_service.extract_playlist_info(
        "https://www.youtube.com/playlist?list=PLfake"
    )
    assert [s["id"] for s in songs] == ["ok-1"]


def test_extract_links_deduplicates_and_cleans() -> None:
    description = (
        "Official site: https://daftpunk.com. Follow us on Instagram "
        "https://instagram.com/daftpunk and Spotify https://daftpunk.com"
    )
    assert youtube_service._extract_links(description) == [
        "https://daftpunk.com",
        "https://instagram.com/daftpunk",
    ]


def test_channels_from_search_parses_channel_entries() -> None:
    entries = [
        {
            "id": CHANNEL_ONE,
            "channel_id": CHANNEL_ONE,
            "channel": "Daft Punk",
            "channel_follower_count": 7_500_000,
            "thumbnails": [{"url": "http://example.com/small.jpg"}],
        },
        {"id": "video-1", "title": "One More Time"},
        {
            "id": CHANNEL_TWO,
            "channel_id": CHANNEL_TWO,
            "uploader": "Fake Punk",
            "channel_follower_count": None,
        },
    ]

    channels = youtube_service._channels_from_search(entries, limit=6)

    assert [c["channel_id"] for c in channels] == [CHANNEL_ONE, CHANNEL_TWO]
    assert channels[0]["name"] == "Daft Punk"
    assert channels[0]["thumbnail"] == "http://example.com/small.jpg"
    assert channels[0]["subscribers"] == 7_500_000
    assert channels[0]["url"] == f"https://www.youtube.com/channel/{CHANNEL_ONE}"
    assert channels[1]["name"] == "Fake Punk"
    assert channels[1]["subscribers"] is None
    assert len(channels) == 2


def test_channels_from_search_respects_limit() -> None:
    entries = [{"channel_id": f"UC{i}", "channel": f"Artist {i}"} for i in range(10)]
    channels = youtube_service._channels_from_search(entries, limit=3)
    assert len(channels) == 3


def test_search_marks_existing_artist(db: Session, monkeypatch) -> None:
    ArtistService.get_or_create_artist(db, "Daft Punk", youtube_channel_id=CHANNEL_ONE)
    monkeypatch.setattr(
        youtube_service,
        "search_artists",
        lambda query, limit=6: [
            _channel(CHANNEL_ONE, "Daft Punk"),
            _channel(CHANNEL_TWO, "Fake Punk"),
        ],
    )

    result = YouTubeArtistService.search(db, query="daft punk", limit=6)

    by_id = {item["channel_id"]: item for item in result["items"]}
    assert by_id[CHANNEL_ONE]["is_in_library"] is True
    assert by_id[CHANNEL_TWO]["is_in_library"] is False
    assert result["total"] == 2


def test_import_creates_artist_and_links_songs(db: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=10: [
            {
                "id": "song-1",
                "title": "One More Time",
                "uploader": "Daft Punk",
                "thumbnail": "http://example.com/thumb.jpg",
                "duration": 300,
            },
            {
                "id": "song-2",
                "title": "Around the World",
                "uploader": "Daft Punk",
                "thumbnail": "http://example.com/thumb.jpg",
                "duration": 240,
            },
        ],
    )
    monkeypatch.setattr(
        youtube_service,
        "get_channel_metadata",
        lambda channel_id: {
            "name": "Daft Punk",
            "thumbnail": "http://example.com/avatar.jpg",
            "description": "French electronic music duo",
            "subscribers": 7_500_000,
            "view_count": 5_000_000_000,
            "video_count": 120,
            "country": "FR",
            "is_verified": True,
            "handle": "@daftpunk",
            "channel_url": "https://www.youtube.com/@daftpunk",
            "links": ["https://daftpunk.com", "https://instagram.com/daftpunk"],
        },
    )

    result = YouTubeArtistService.import_artist(
        db,
        YouTubeArtistImport(
            channel_id=CHANNEL_ONE,
            name="Daft Punk",
            thumbnail="http://avatar",
        ),
    )

    artist = db.query(ArtistModel).filter(ArtistModel.slug == result["slug"]).first()
    assert artist is not None
    assert artist.external_ids.get("youtube_channel_id") == CHANNEL_ONE
    assert artist.thumbnail_url == "http://example.com/avatar.jpg"
    assert artist.bio == "French electronic music duo"
    assert artist.follower_count == 0
    assert artist.channel_metadata["subscribers"] == 7_500_000
    assert artist.channel_metadata["view_count"] == 5_000_000_000
    assert artist.channel_metadata["handle"] == "@daftpunk"
    assert artist.channel_metadata["links"] == [
        "https://daftpunk.com",
        "https://instagram.com/daftpunk",
    ]
    assert {s.id for s in artist.songs} == {"song-1", "song-2"}


def test_import_falls_back_to_provided_thumbnail(db: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=10: [],
    )
    monkeypatch.setattr(
        youtube_service,
        "get_channel_metadata",
        lambda channel_id: {
            "name": "Daft Punk",
            "thumbnail": "",
            "description": "",
            "subscribers": None,
        },
    )

    result = YouTubeArtistService.import_artist(
        db,
        YouTubeArtistImport(
            channel_id=CHANNEL_ONE,
            name="Daft Punk",
            thumbnail="http://avatar",
        ),
    )

    artist = db.query(ArtistModel).filter(ArtistModel.slug == result["slug"]).first()
    assert artist is not None
    assert artist.thumbnail_url == "http://avatar"
    assert artist.bio is None


def test_import_keeps_existing_bio_and_followers(db: Session, monkeypatch) -> None:
    artist = ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id=CHANNEL_ONE
    )
    artist.bio = "Existing bio"
    artist.follower_count = 99
    db.commit()

    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=10: [],
    )
    monkeypatch.setattr(
        youtube_service,
        "get_channel_metadata",
        lambda channel_id: {
            "name": "Daft Punk",
            "thumbnail": "http://example.com/avatar.jpg",
            "description": "Fresh description",
            "subscribers": 7_500_000,
        },
    )

    result = YouTubeArtistService.import_artist(
        db,
        YouTubeArtistImport(
            channel_id=CHANNEL_ONE,
            name="Daft Punk",
            thumbnail="http://avatar",
        ),
    )

    artist = db.query(ArtistModel).filter(ArtistModel.slug == result["slug"]).first()
    assert artist is not None
    assert artist.thumbnail_url == "http://example.com/avatar.jpg"
    assert artist.bio == "Existing bio"
    assert artist.follower_count == 99


def test_import_is_idempotent(db: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=10: [
            {
                "id": "song-1",
                "title": "One More Time",
                "uploader": "Daft Punk",
                "thumbnail": "http://example.com/thumb.jpg",
                "duration": 300,
            }
        ],
    )
    monkeypatch.setattr(
        youtube_service,
        "get_channel_metadata",
        lambda channel_id: {
            "name": "Daft Punk",
            "thumbnail": "http://example.com/avatar.jpg",
            "description": "",
            "subscribers": None,
        },
    )
    data = YouTubeArtistImport(
        channel_id=CHANNEL_ONE, name="Daft Punk", thumbnail="http://avatar"
    )

    first = YouTubeArtistService.import_artist(db, data)
    second = YouTubeArtistService.import_artist(db, data)

    assert first["slug"] == second["slug"]
    artist = db.query(ArtistModel).filter(ArtistModel.slug == first["slug"]).first()
    assert artist is not None
    assert len(artist.songs) == 1


def test_import_rejects_invalid_channel_id(db: Session) -> None:
    data = YouTubeArtistImport(channel_id="not a channel", name="X", thumbnail=None)
    with pytest.raises(HTTPException) as exc:
        YouTubeArtistService.import_artist(db, data)
    assert exc.value.status_code == 400


def test_youtube_search_endpoint(
    client, db: Session, auth_headers: dict[str, str], monkeypatch
) -> None:
    ArtistService.get_or_create_artist(db, "Daft Punk", youtube_channel_id=CHANNEL_ONE)
    monkeypatch.setattr(
        youtube_service,
        "search_artists",
        lambda query, limit=6: [_channel(CHANNEL_ONE, "Daft Punk")],
    )

    response = client.get(
        "/api/v1/artists/youtube/search?q=daft+punk", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["channel_id"] == CHANNEL_ONE
    assert data["items"][0]["is_in_library"] is True


def test_youtube_import_endpoint(
    client, db: Session, auth_headers: dict[str, str], monkeypatch
) -> None:
    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=20: [],
    )

    response = client.post(
        "/api/v1/artists/youtube/import",
        headers=auth_headers,
        json={"channel_id": CHANNEL_ONE, "name": "Daft Punk", "thumbnail": None},
    )
    assert response.status_code == 200
    assert response.json()["slug"] == "daft-punk"
    artist = db.query(ArtistModel).filter(ArtistModel.slug == "daft-punk").first()
    assert artist is not None


def test_get_artist_songs_merges_channel_uploads_and_library(
    db: Session, monkeypatch
) -> None:
    artist = ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id=CHANNEL_ONE
    )
    existing = SongModel(
        id="lib-song",
        title="Homework Track",
        uploader="Daft Punk",
        thumbnail="",
        duration=200,
    )
    db.add(existing)
    db.commit()
    artist.songs.append(existing)
    db.commit()

    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=50: [
            _upload("upload-1", "One More Time"),
            _upload("lib-song", "Homework Track"),
        ],
    )

    songs = ArtistService.get_artist_songs(db, artist.slug)

    ids = [s["id"] for s in songs]
    assert ids == ["upload-1", "lib-song"]
    assert songs[0]["created_at"] is None


def test_get_artist_songs_falls_back_to_library_on_failure(
    db: Session, monkeypatch
) -> None:
    artist = ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id=CHANNEL_ONE
    )
    existing = SongModel(
        id="lib-song",
        title="Homework Track",
        uploader="Daft Punk",
        thumbnail="",
        duration=200,
    )
    db.add(existing)
    db.commit()
    artist.songs.append(existing)
    db.commit()

    def boom(*args, **kwargs):
        raise RuntimeError

    monkeypatch.setattr(youtube_service, "get_channel_uploads", boom)

    songs = ArtistService.get_artist_songs(db, artist.slug)
    assert [s["id"] for s in songs] == ["lib-song"]


def test_get_artist_albums_uses_channel_playlists(db: Session, monkeypatch) -> None:
    artist = ArtistService.get_or_create_artist(
        db, "Daft Punk", youtube_channel_id=CHANNEL_ONE
    )
    monkeypatch.setattr(
        youtube_service,
        "get_channel_playlists",
        lambda channel_id, limit=12: [
            {"id": "PLone", "name": "Discovery", "url": "http://pl/one"},
            {"id": "PLtwo", "name": "Homework", "url": "http://pl/two"},
        ],
    )
    monkeypatch.setattr(
        youtube_service,
        "get_playlist_songs",
        lambda playlist_id, limit=30: [_upload(f"pl-{playlist_id}-1", "Track")],
    )
    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=50: [
            _upload("pl-PLone-1", "Track"),
            _upload("single-1", "Loose Track"),
        ],
    )

    result = ArtistService.get_artist_albums(db, artist.slug)

    albums = {a["name"]: a for a in result["albums"]}
    assert set(albums) == {"Discovery", "Homework", "Singles"}
    assert [s["id"] for s in albums["Discovery"]["songs"]] == ["pl-PLone-1"]
    assert albums["Discovery"]["cover_image_url"] == "http://example.com/thumb.jpg"
    # "single-1" is not in any playlist, so it lands in Singles
    assert [s["id"] for s in albums["Singles"]["songs"]] == ["single-1"]


def test_get_artist_songs_filters_stale_tab_nav_rows(db: Session, monkeypatch) -> None:
    artist = ArtistService.get_or_create_artist(
        db, "Adele", youtube_channel_id=CHANNEL_ONE
    )
    tab_row = SongModel(
        id=CHANNEL_ONE,
        title="Adele - Videos",
        uploader="Adele",
        thumbnail="",
        duration=None,
    )
    db.add(tab_row)
    db.commit()
    artist.songs.append(tab_row)
    db.commit()

    monkeypatch.setattr(
        youtube_service,
        "get_channel_uploads",
        lambda channel_id, limit=50: [_upload("video-1", "Hello")],
    )

    songs = ArtistService.get_artist_songs(db, artist.slug)
    assert [s["id"] for s in songs] == ["video-1"]


def test_get_artist_albums_plain_artist_groups_singles(db: Session) -> None:
    artist = ArtistService.get_or_create_artist(db, "Radiohead")
    song = SongModel(
        id="vid-1",
        title="Creep",
        uploader="Radiohead",
        thumbnail="",
        duration=240,
    )
    db.add(song)
    db.commit()
    artist.songs.append(song)
    db.commit()

    result = ArtistService.get_artist_albums(db, artist.slug)

    assert len(result["albums"]) == 1
    assert result["albums"][0]["name"] == "Singles"
    assert [s["id"] for s in result["albums"][0]["songs"]] == ["vid-1"]
