from sqlalchemy.orm import Session

from app.db.models.artist import ArtistModel
from app.db.models.user import UserModel
from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.artist import ArtistService
from app.services.history import HistoryService
from app.services.songs import SongService
from app.services.stats import StatsService


def make_artist(db: Session, name: str, genres: list[str]) -> ArtistModel:
    artist = ArtistService.get_or_create_artist(db, name)
    artist.genres = genres
    db.commit()
    return artist


def record(
    db: Session, user_id: str, song_id: str, uploader: str, duration: int = 60
) -> None:
    HistoryService.record_listen(
        db,
        user_id=user_id,
        data=HistoryRecordCreate(
            song=Song(id=song_id, title=song_id, uploader=uploader, thumbnail=""),
            play_duration=duration,
        ),
    )


class TestStatsService:
    def test_aggregates(self, db: Session, test_user: UserModel) -> None:
        make_artist(db, "Radiohead", ["rock", "alternative"])
        db_song = SongService.upsert_song(
            db, Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail="")
        )
        ArtistService.sync_song_artists(db, db_song)

        record(db, test_user.id, "vid1", "Radiohead", 60)
        record(db, test_user.id, "vid1", "Radiohead", 30)

        stats = StatsService.get_stats(db, user_id=test_user.id)
        assert stats["total_plays"] == 2
        assert stats["total_play_time"] == 90
        assert stats["top_songs"][0]["song"]["id"] == "vid1"
        assert stats["top_songs"][0]["count"] == 2
        assert stats["top_artists"] == [{"name": "Radiohead", "plays": 2}]
        assert {g["name"] for g in stats["genres"]} == {"rock", "alternative"}
        assert stats["cached"] is False

    def test_cached_on_second_call(self, db: Session, test_user: UserModel) -> None:
        record(db, test_user.id, "vid1", "Radiohead", 60)

        first = StatsService.get_stats(db, user_id=test_user.id)
        second = StatsService.get_stats(db, user_id=test_user.id)
        assert first["cached"] is False
        assert second["cached"] is True
        assert second["total_plays"] == 1

    def test_recalculate_forces_refresh(
        self, db: Session, test_user: UserModel
    ) -> None:
        record(db, test_user.id, "vid1", "Radiohead", 60)
        StatsService.get_stats(db, user_id=test_user.id)
        record(db, test_user.id, "vid2", "Coldplay", 30)

        cached = StatsService.get_stats(db, user_id=test_user.id)
        assert cached["total_plays"] == 1

        fresh = StatsService.recalculate(db, user_id=test_user.id)
        assert fresh["total_plays"] == 2
        assert fresh["cached"] is False

    def test_top_helpers(self, db: Session, test_user: UserModel) -> None:
        record(db, test_user.id, "vid1", "Radiohead", 60)
        record(db, test_user.id, "vid2", "Coldplay", 30)

        assert [
            a["name"] for a in StatsService.get_top_artists(db, user_id=test_user.id)
        ] == [
            "Radiohead",
            "Coldplay",
        ]
        assert (
            StatsService.get_top_songs(db, user_id=test_user.id)[0]["song"]["id"]
            == "vid1"
        )
        assert StatsService.get_genres(db, user_id=test_user.id) == []

    def test_genres_resolved_from_uploader(
        self,
        db: Session,
        test_user: UserModel,
        monkeypatch,
    ) -> None:
        record(db, test_user.id, "vid1", "Coldplay", 60)
        record(db, test_user.id, "vid1", "Coldplay", 30)

        monkeypatch.setattr(
            "app.services.stats.GenreService.resolve_artist_genres",
            lambda db, name: ["rock", "pop"] if name.lower() == "coldplay" else [],
        )

        stats = StatsService.get_stats(db, user_id=test_user.id)
        assert stats["top_artists"] == [{"name": "Coldplay", "plays": 2}]
        assert {g["name"] for g in stats["genres"]} == {"rock", "pop"}
        assert {g["plays"] for g in stats["genres"]} == {2}

    def test_genres_scaled_by_plays(self, db: Session, test_user: UserModel) -> None:
        make_artist(db, "Radiohead", ["rock"])
        db_song = SongService.upsert_song(
            db, Song(id="vid1", title="Creep", uploader="Radiohead", thumbnail="")
        )
        ArtistService.sync_song_artists(db, db_song)
        record(db, test_user.id, "vid1", "Radiohead", 60)
        record(db, test_user.id, "vid1", "Radiohead", 60)

        stats = StatsService.get_stats(db, user_id=test_user.id)
        assert stats["genres"] == [{"name": "rock", "plays": 2}]
