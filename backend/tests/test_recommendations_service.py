from typing import Any

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.moods import MOODS
from app.db.models.user import UserModel
from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.artist import ArtistService
from app.services.history import HistoryService
from app.services.recommendations import (
    RecommendationsService,
    _rec_cache,
    youtube_service,
    ytmusic_service,
)
from app.services.songs import SongService


def make_song(id_: str, uploader: str) -> Song:
    return Song(id=id_, title=f"Title {id_}", uploader=uploader, thumbnail="")


def record(db: Session, user_id: str, id_: str, uploader: str, duration: int = 60) -> None:
    HistoryService.record_listen(
        db,
        user_id=user_id,
        data=HistoryRecordCreate(song=make_song(id_, uploader), play_duration=duration),
    )


def _mock_songs_for(query: str) -> list[dict[str, Any]]:
    key = query.strip().lower()
    if key == "radiohead":
        return [
            {
                "id": "vid1",
                "title": "Creep",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 240,
            },
            {
                "id": "vid2",
                "title": "Karma Police",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 260,
            },
            {
                "id": "vid3",
                "title": "No Surprises",
                "uploader": "Radiohead",
                "thumbnail": "",
                "duration": 220,
            },
        ]
    if key.endswith(" songs"):
        genre = key[: -len(" songs")]
        return [
            {
                "id": f"{genre}-1",
                "title": f"{genre} track",
                "uploader": "DJ",
                "thumbnail": "",
                "duration": 180,
            }
        ]
    return []


@pytest.fixture(autouse=True)
def mock_youtube_search(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the network-backed YouTube search with a deterministic stub."""

    def fake_search(query: str) -> tuple[list[dict[str, Any]], bool]:
        return _mock_songs_for(query), True

    monkeypatch.setattr(youtube_service, "search_songs", fake_search)
    monkeypatch.setattr(ytmusic_service, "search_songs", lambda query: [])
    monkeypatch.setattr(ytmusic_service, "find_mood_playlist", lambda mood: None)
    monkeypatch.setattr(ytmusic_service, "mood_catalog", lambda: [])
    monkeypatch.setattr(
        ytmusic_service, "playlist_songs", lambda playlist_id, limit: []
    )
    _rec_cache.clear()
    yield
    _rec_cache.clear()


class TestGetMoods:
    def test_returns_curated_moods(self) -> None:
        moods = RecommendationsService.get_moods()
        assert len(moods) == 8
        for mood in moods:
            assert mood["id"]
            assert mood["label"]
            assert mood["genres"]


class TestGetUserSeeds:
    def test_merges_favorite_and_listened_genres(
        self, db: Session, test_user: UserModel
    ) -> None:
        test_user.favorite_genres = ["Rock", "jazz"]
        db.commit()

        artist = ArtistService.get_or_create_artist(db, "Radiohead")
        artist.genres = ["rock", "alternative"]
        db.commit()
        db_song = SongService.upsert_song(
            db, Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail="")
        )
        ArtistService.sync_song_artists(db, db_song)
        record(db, test_user.id, "vid1", "Radiohead", 60)

        seeds = RecommendationsService.get_user_seeds(db, test_user)

        assert "Rock" in seeds["genres"]
        assert "jazz" in seeds["genres"]
        assert "alternative" in seeds["genres"]
        assert [g.lower() for g in seeds["genres"]].count("rock") == 1
        assert seeds["top_artists"][0]["name"] == "Radiohead"

    def test_dedupes_favorite_and_listened(self, db: Session, test_user: UserModel) -> None:
        test_user.favorite_genres = ["pop", "jazz"]
        db.commit()
        seeds = RecommendationsService.get_user_seeds(db, test_user)
        assert seeds["genres"] == ["pop", "jazz"]


class TestGetForUser:
    def test_suggests_and_excludes_recently_played(
        self, db: Session, test_user: UserModel
    ) -> None:
        record(db, test_user.id, "vid1", "Radiohead", 60)

        result = RecommendationsService.get_for_user(db, user_id=test_user.id, limit=20)

        assert result
        assert "vid1" not in {s["id"] for s in result}
        assert {s["id"] for s in result} == {"vid2", "vid3"}
        assert all(s["title"] for s in result)

    def test_respects_limit(self, db: Session, test_user: UserModel) -> None:
        record(db, test_user.id, "vid1", "Radiohead", 60)
        result = RecommendationsService.get_for_user(db, user_id=test_user.id, limit=1)
        assert len(result) == 1

    def test_serves_cached_batch(self, db: Session, test_user: UserModel) -> None:
        record(db, test_user.id, "vid1", "Radiohead", 60)
        first = RecommendationsService.get_for_user(db, user_id=test_user.id, limit=20)
        second = RecommendationsService.get_for_user(db, user_id=test_user.id, limit=20)
        assert [s["id"] for s in first] == [s["id"] for s in second]


class TestGetGenres:
    def test_groups_catalog_by_playlist_title(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(
            ytmusic_service,
            "mood_catalog",
            lambda: [
                {"playlistId": "pl-pop-1", "title": "Pop", "thumbnail": "a.jpg"},
                {"playlistId": "pl-pop-2", "title": "Pop", "thumbnail": "b.jpg"},
                {"playlistId": "pl-rock", "title": "Rock", "thumbnail": "c.jpg"},
                {"playlistId": "", "title": "Untitled"},
            ],
        )
        genres = RecommendationsService.get_genres()
        by_name = {g["name"]: g for g in genres}
        assert set(by_name) == {"Pop", "Rock"}
        assert [p["id"] for p in by_name["Pop"]["playlists"]] == [
            "pl-pop-1",
            "pl-pop-2",
        ]
        assert genres == sorted(genres, key=lambda g: g["name"].casefold())


class TestGetRadioSongs:
    def test_mood_seed(self, db: Session, test_user: UserModel) -> None:
        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="mood", seed_value="energetic", count=25
        )
        assert result["seed_type"] == "mood"
        assert result["seed_value"] == "energetic"
        assert len(result["songs"]) == 4

    def test_genre_seed_falls_back_to_search(
        self, db: Session, test_user: UserModel
    ) -> None:
        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="genre", seed_value="dance", count=25
        )
        assert result["seed_type"] == "genre"
        assert len(result["songs"]) == 1
        assert result["songs"][0]["id"] == "dance-1"

    def test_genre_seed_mixes_multiple_genres(
        self, db: Session, test_user: UserModel
    ) -> None:
        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="genre", seed_value="dance,jazz", count=25
        )
        assert {s["id"] for s in result["songs"]} == {"dance-1", "jazz-1"}

    def test_genre_seed_dedupes_repeated_genres(
        self, db: Session, test_user: UserModel
    ) -> None:
        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="genre", seed_value="pop,pop", count=25
        )
        assert len(result["songs"]) == 1

    def test_genre_seed_enriches_from_curated_playlists(
        self, db: Session, test_user: UserModel, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(
            ytmusic_service,
            "mood_catalog",
            lambda: [
                {"playlistId": "pl-pop", "title": "Pop Hits", "thumbnail": ""},
                {"playlistId": "pl-other", "title": "Rock Classics", "thumbnail": ""},
            ],
        )
        monkeypatch.setattr(
            ytmusic_service,
            "playlist_songs",
            lambda playlist_id, limit: (
                [{"id": "curated-1", "title": "Curated", "uploader": "DJ", "thumbnail": "", "duration": 180}]
                if playlist_id == "pl-pop"
                else []
            ),
        )
        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="genre", seed_value="pop", count=25
        )
        ids = {s["id"] for s in result["songs"]}
        assert ids == {"pop-1", "curated-1"}

    def test_artist_seed(self, db: Session, test_user: UserModel) -> None:
        ArtistService.get_or_create_artist(db, "Radiohead")

        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="artist", seed_value="Radiohead", count=25
        )
        assert result["seed_type"] == "artist"
        assert len(result["songs"]) == 3

    def test_excludes_recently_played(self, db: Session, test_user: UserModel) -> None:
        ArtistService.get_or_create_artist(db, "Radiohead")
        record(db, test_user.id, "vid2", "Radiohead", 60)

        result = RecommendationsService.get_radio_songs(
            db, user_id=test_user.id, seed_type="artist", seed_value="Radiohead", count=25
        )
        ids = {s["id"] for s in result["songs"]}
        assert "vid2" not in ids

    def test_unknown_mood_rejected(self, db: Session, test_user: UserModel) -> None:
        with pytest.raises(HTTPException) as exc:
            RecommendationsService.get_radio_songs(
                db,
                user_id=test_user.id,
                seed_type="mood",
                seed_value="nonexistent",
                count=25,
            )
        assert exc.value.status_code == 400

    def test_invalid_seed_type_rejected(self, db: Session, test_user: UserModel) -> None:
        with pytest.raises(HTTPException) as exc:
            RecommendationsService.get_radio_songs(
                db, user_id=test_user.id, seed_type="foo", seed_value="x", count=25
            )
        assert exc.value.status_code == 400


def test_moods_catalog_matches_service() -> None:
    assert RecommendationsService.get_moods() == MOODS
