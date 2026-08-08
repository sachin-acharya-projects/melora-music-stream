from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel
from app.schemas.history import HistoryRecordCreate
from app.schemas.song import Song
from app.services.history import HistoryService


def make_song(id_: str, uploader: str) -> Song:
    return Song(id=id_, title=f"Title {id_}", uploader=uploader, thumbnail="")


def record(db: Session, user_id: str, song: Song, **kwargs) -> dict:
    return HistoryService.record_listen(
        db, user_id=user_id, data=HistoryRecordCreate(song=song, **kwargs)
    )


class TestRecordListen:
    def test_creates_entry(self, db: Session, test_user: UserModel) -> None:
        result = record(db, test_user.id, make_song("vid1", "Radiohead"))
        assert result["song"]["id"] == "vid1"
        assert result["play_duration"] is None

        entry = (
            db.query(ListeningHistoryModel)
            .filter(ListeningHistoryModel.user_id == test_user.id)
            .first()
        )
        assert entry is not None
        assert entry.song_id == "vid1"

    def test_reuses_existing_song(self, db: Session, test_user: UserModel) -> None:
        record(db, test_user.id, make_song("vid1", "Radiohead"))
        record(db, test_user.id, make_song("vid1", "Radiohead"))

        songs = db.query(SongModel).filter(SongModel.id == "vid1").all()
        assert len(songs) == 1

    def test_records_play_duration(self, db: Session, test_user: UserModel) -> None:
        result = record(
            db, test_user.id, make_song("vid1", "Radiohead"), play_duration=30
        )
        assert result["play_duration"] == 30


class TestGetHistory:
    def test_paginated(self, db: Session, test_user: UserModel) -> None:
        for i in range(3):
            record(db, test_user.id, make_song(f"vid{i}", "Radiohead"))

        result = HistoryService.get_history(
            db, user_id=test_user.id, page=1, page_size=2
        )
        assert result["total"] == 3
        assert len(result["items"]) == 2

        page2 = HistoryService.get_history(
            db, user_id=test_user.id, page=2, page_size=2
        )
        assert len(page2["items"]) == 1

    def test_recent(self, db: Session, test_user: UserModel) -> None:
        for i in range(3):
            record(db, test_user.id, make_song(f"vid{i}", "Radiohead"))

        recent = HistoryService.get_recent(db, user_id=test_user.id, limit=2)
        assert len(recent) == 2
        assert recent[0]["song"]["id"] == "vid2"


class TestGetStats:
    def test_aggregates(self, db: Session, test_user: UserModel) -> None:
        record(db, test_user.id, make_song("vid1", "Radiohead"), play_duration=60)
        record(db, test_user.id, make_song("vid2", "Coldplay"), play_duration=30)

        stats = HistoryService.get_stats(db, user_id=test_user.id)
        assert stats["total_plays"] == 2
        assert stats["total_play_time"] == 90
        assert len(stats["plays_last_30_days"]) == 1
        assert stats["top_songs"][0]["count"] == 1
        assert {t["name"] for t in stats["top_artists"]} == {"Radiohead", "Coldplay"}

    def test_old_entries_excluded_from_daily(
        self, db: Session, test_user: UserModel
    ) -> None:
        old = datetime.now(UTC) - timedelta(days=45)
        db.add(
            ListeningHistoryModel(
                user_id=test_user.id,
                song_id="vid1",
                played_at=old,
            )
        )
        db.commit()
        record(db, test_user.id, make_song("vid2", "Radiohead"))

        stats = HistoryService.get_stats(db, user_id=test_user.id)
        assert stats["total_plays"] == 2
        assert len(stats["plays_last_30_days"]) == 1
