from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.db.models.song import SongModel
from app.db.models.user import UserModel
from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.artist import ArtistService
from app.services.history import HistoryService
from app.services.metadata_enrichment import ArtistEnricher
from app.services.songs import SongService
from app.services.stats import StatsService

# The autouse conftest fixture stubs ArtistService._discover_related_artists so
# featured/suggested endpoints stay offline. Capture the real implementation at
# import time (before fixtures run) for the focused test below.
_REAL_DISCOVER_RELATED_ARTISTS = ArtistService.__dict__[
    "_discover_related_artists"
].__func__


def make_song(db: Session, song_id: str, uploader: str) -> SongModel:
    song = Song(id=song_id, title=f"Title {song_id}", uploader=uploader, thumbnail="")
    return SongService.upsert_song(db, song)


class TestGetOrCreateArtist:
    def test_creates_and_reuses(self, db: Session) -> None:
        artist = ArtistService.get_or_create_artist(db, "  Radiohead  ")
        assert artist.name == "Radiohead"
        assert artist.slug == "radiohead"

        again = ArtistService.get_or_create_artist(db, "radiohead")
        assert again.id == artist.id

    def test_slug_collision_gets_suffix(self, db: Session) -> None:
        first = ArtistService.get_or_create_artist(db, "AC/DC")
        second = ArtistService.get_or_create_artist(db, "Ac Dc")
        assert first.id != second.id
        assert second.slug.startswith("ac-dc-")

    def test_empty_name_rejected(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            ArtistService.get_or_create_artist(db, "   ")
        assert exc_info.value.status_code == 400


class TestSyncSongArtists:
    def test_links_split_artists(self, db: Session) -> None:
        db_song = make_song(db, "song1", "Artist One feat. Artist Two")
        ArtistService.sync_song_artists(db, db_song)

        names = sorted(a.name for a in db_song.artists)
        assert names == ["Artist One", "Artist Two"]

    def test_idempotent(self, db: Session) -> None:
        db_song = make_song(db, "song2", "Solo Artist")
        ArtistService.sync_song_artists(db, db_song)
        ArtistService.sync_song_artists(db, db_song)
        assert len(db_song.artists) == 1


class TestArtistSerialization:
    def test_serialize(self, db: Session, test_user: UserModel) -> None:
        artist = ArtistService.get_or_create_artist(db, "Radiohead")
        result = ArtistService.serialize(artist, current_user_id=test_user.id)
        assert result["name"] == "Radiohead"
        assert result["slug"] == "radiohead"
        assert result["is_following"] is False
        assert result["follower_count"] == 0
        assert result["more_info"] is None

    def test_serialize_more_info(self, db: Session, test_user: UserModel) -> None:
        artist = ArtistService.get_or_create_artist(db, "Radiohead")
        artist.bio = "British rock band"
        artist.channel_metadata = {
            "subscribers": 4_000_000,
            "view_count": 1_000_000_000,
            "video_count": 60,
            "country": "GB",
            "is_verified": True,
            "handle": "@radiohead",
            "channel_url": "https://www.youtube.com/@radiohead",
            "description": "British rock band",
            "links": ["https://radiohead.com"],
        }
        db.commit()

        result = ArtistService.serialize(artist, current_user_id=test_user.id)

        assert result["more_info"]["subscribers"] == 4_000_000
        assert result["more_info"]["video_count"] == 60
        assert result["more_info"]["handle"] == "@radiohead"
        assert result["more_info"]["links"] == ["https://radiohead.com"]


class TestToggleFollow:
    def test_follow_and_unfollow(self, db: Session, test_user: UserModel) -> None:
        artist = ArtistService.get_or_create_artist(db, "Radiohead")

        result = ArtistService.toggle_follow(db, artist_id=artist.id, user=test_user)
        assert result == {"is_following": True, "follower_count": 1}

        result = ArtistService.toggle_follow(db, artist_id=artist.id, user=test_user)
        assert result == {"is_following": False, "follower_count": 0}

    def test_following_list(self, db: Session, test_user: UserModel) -> None:
        followed = ArtistService.get_or_create_artist(db, "Radiohead")
        not_followed = ArtistService.get_or_create_artist(db, "Coldplay")
        ArtistService.toggle_follow(db, artist_id=followed.id, user=test_user)

        result = ArtistService.get_following_artists(db, test_user)
        assert [a["slug"] for a in result] == ["radiohead"]
        assert all(a["is_following"] for a in result)
        assert not_followed.name


class TestArtistQueries:
    def test_get_all_artists(self, db: Session, test_user: UserModel) -> None:
        radiohead = ArtistService.get_or_create_artist(db, "Radiohead")
        coldplay = ArtistService.get_or_create_artist(db, "Coldplay")
        ArtistService.toggle_follow(db, artist_id=radiohead.id, user=test_user)
        ArtistService.toggle_follow(db, artist_id=coldplay.id, user=test_user)

        result = ArtistService.get_all_artists(
            db, test_user, sort_by="name", order="asc"
        )
        assert result["total"] == 2
        assert [a["name"] for a in result["items"]] == ["Coldplay", "Radiohead"]

        search = ArtistService.get_all_artists(db, test_user, search="radio")
        assert search["total"] == 1

    def test_get_all_artists_sorted_by_created_at(
        self, db: Session, test_user: UserModel
    ) -> None:
        radiohead = ArtistService.get_or_create_artist(db, "Radiohead")
        coldplay = ArtistService.get_or_create_artist(db, "Coldplay")

        radiohead.created_at = datetime.now(UTC) - timedelta(days=2)
        coldplay.created_at = datetime.now(UTC) - timedelta(days=1)
        db.commit()
        ArtistService.toggle_follow(db, artist_id=radiohead.id, user=test_user)
        ArtistService.toggle_follow(db, artist_id=coldplay.id, user=test_user)

        result = ArtistService.get_all_artists(
            db, test_user, sort_by="created_at", order="desc"
        )
        assert result["total"] == 2
        assert [a["name"] for a in result["items"]] == ["Coldplay", "Radiohead"]

    def test_get_all_artists_sorted_by_plays(
        self, db: Session, test_user: UserModel
    ) -> None:
        ArtistService.get_or_create_artist(db, "Radiohead").genres = ["rock"]
        ArtistService.get_or_create_artist(db, "Coldplay").genres = ["rock"]
        db.commit()

        def play(song_id: str, uploader: str, times: int) -> None:
            for _ in range(times):
                HistoryService.record_listen(
                    db,
                    user_id=test_user.id,
                    data=HistoryRecordCreate(
                        song=Song(
                            id=song_id,
                            title=song_id,
                            uploader=uploader,
                            thumbnail="",
                        ),
                    ),
                )

        play("vid1", "Radiohead", 4)
        play("vid2", "Coldplay", 3)

        result = ArtistService.get_all_artists(
            db, test_user, sort_by="plays", order="desc"
        )
        assert result["total"] == 2
        assert [a["name"] for a in result["items"]] == ["Radiohead", "Coldplay"]
        assert result["items"][0]["play_count"] == 4

        asc = ArtistService.get_all_artists(db, test_user, sort_by="plays", order="asc")
        assert [a["name"] for a in asc["items"]] == ["Coldplay", "Radiohead"]

    def test_get_artist_by_slug_with_songs(
        self, db: Session, test_user: UserModel
    ) -> None:
        ArtistService.get_or_create_artist(db, "Radiohead")
        db_song = make_song(db, "song1", "Radiohead")
        ArtistService.sync_song_artists(db, db_song)

        result = ArtistService.get_artist_by_slug(db, "radiohead", test_user)
        assert result["name"] == "Radiohead"
        assert [s["id"] for s in result["songs"]] == ["song1"]

    def test_get_artist_not_found(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            ArtistService.get_artist_by_slug(db, "nope", None)
        assert exc_info.value.status_code == 404

    def test_get_artist_by_slug_skips_sync_enrichment(
        self, db: Session, monkeypatch
    ) -> None:
        ArtistService.get_or_create_artist(db, "Radiohead")

        def boom(*args, **kwargs):
            raise RuntimeError

        monkeypatch.setattr(ArtistEnricher, "enrich", boom)

        result = ArtistService.get_artist_by_slug(db, "radiohead", None, enrich=False)
        assert result["name"] == "Radiohead"

        with pytest.raises(RuntimeError):
            ArtistService.get_artist_by_slug(db, "radiohead", None)

    def test_albums_grouped(self, db: Session) -> None:
        ArtistService.get_or_create_artist(db, "Radiohead")
        db_song = make_song(db, "song1", "Radiohead")
        ArtistService.sync_song_artists(db, db_song)

        result = ArtistService.get_artist_albums(db, "radiohead")
        assert result["albums"][0]["name"] == "Singles"
        assert len(result["albums"][0]["songs"]) == 1


def test_discover_related_artists_reports_subscribers_not_followers(
    db: Session, monkeypatch
) -> None:
    class FakeYTMusic:
        def search(self, artist_name, filter=None, limit=1):  # noqa: A002
            return [{"browseId": f"CH-{artist_name}"}]

        def get_artist(self, browse_id):
            return {
                "related": {
                    "results": [
                        {
                            "title": "Related Artist",
                            "browseId": "CH-RELATED",
                            "subscribers": "1.42M",
                            "thumbnails": [
                                {"url": "http://small"},
                                {"url": "http://big"},
                            ],
                        }
                    ]
                }
            }

    monkeypatch.setattr("app.services.artist.YTMusic", FakeYTMusic)
    monkeypatch.setattr(
        StatsService,
        "get_top_artists",
        lambda db, *, user_id, limit: [{"name": "Played Artist", "plays": 5}],
    )
    monkeypatch.setattr(
        ArtistService,
        "_discover_related_artists",
        _REAL_DISCOVER_RELATED_ARTISTS,
    )

    items = ArtistService._discover_related_artists(db, "user-1")

    assert len(items) == 1
    item = items[0]
    assert item["name"] == "Related Artist"
    assert item["is_external"] is True
    assert item["subscribers"] == 1_420_000
    assert item["follower_count"] == 0
