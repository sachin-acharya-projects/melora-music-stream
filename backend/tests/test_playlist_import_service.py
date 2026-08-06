from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel
from app.db.models.user import UserModel
from app.schemas.song import PlaylistImport
from app.services.playlist_import import PlaylistImportService
from app.services.youtube import youtube_service


def _entry(video_id: str | None, title: str) -> dict:
    return {
        "id": video_id,
        "title": title,
        "uploader": "Test Channel",
        "thumbnail": "http://example.com/thumb.jpg",
        "duration": 180,
    }


class TestImportPlaylist:
    def test_import_deduplicates_repeated_videos(
        self, db: Session, test_user: UserModel, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            youtube_service,
            "extract_playlist_info",
            lambda url: [_entry("song-1", "One"), _entry("song-1", "One")],
        )

        result = PlaylistImportService.import_playlist(
            db,
            PlaylistImport(url="https://youtube.com/playlist?list=abc", name="Mix"),
            test_user,
        )

        assert result["count"] == 1
        playlist = db.query(PlaylistModel).filter(PlaylistModel.name == "Mix").first()
        assert playlist is not None
        assert len(playlist.songs) == 1
        assert playlist.songs[0].id == "song-1"

    def test_import_skips_entries_without_id(
        self, db: Session, test_user: UserModel, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            youtube_service,
            "extract_playlist_info",
            lambda url: [
                _entry("song-1", "One"),
                _entry(None, "Broken"),
                _entry("song-2", "Two"),
            ],
        )

        result = PlaylistImportService.import_playlist(
            db,
            PlaylistImport(url="https://youtube.com/playlist?list=abc", name="Mix"),
            test_user,
        )

        assert result["count"] == 2
        playlist = db.query(PlaylistModel).filter(PlaylistModel.name == "Mix").first()
        assert playlist is not None
        assert {song.id for song in playlist.songs} == {"song-1", "song-2"}

    def test_import_into_existing_playlist_is_idempotent(
        self, db: Session, test_user: UserModel, monkeypatch
    ) -> None:
        playlist = PlaylistModel(name="Mix", user_id=test_user.id)
        db.add(playlist)
        db.commit()
        db.refresh(playlist)

        monkeypatch.setattr(
            youtube_service,
            "extract_playlist_info",
            lambda url: [_entry("song-1", "One"), _entry("song-2", "Two")],
        )

        first = PlaylistImportService.import_playlist(
            db,
            PlaylistImport(url="https://youtube.com/playlist?list=abc", id=playlist.id),
            test_user,
        )
        assert first["count"] == 2

        second = PlaylistImportService.import_playlist(
            db,
            PlaylistImport(url="https://youtube.com/playlist?list=abc", id=playlist.id),
            test_user,
        )
        assert second["count"] == 0

        db.refresh(playlist)
        assert len(playlist.songs) == 2
