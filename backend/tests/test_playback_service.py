from sqlalchemy.orm import Session

from app.schemas.song import PlaybackState, Song
from app.services.playback import PlaybackService


class TestGetPlaybackState:
    def test_empty_state(self, db: Session) -> None:
        result = PlaybackService.get_playback_state(db, user_id="user-1")
        assert result["last_song_id"] is None
        assert result["current_queue"] == []
        assert result["recent_songs"] == []
        assert result["last_playlist_id"] is None


class TestUpsertPlaybackState:
    def test_creates_state(self, db: Session) -> None:
        data = PlaybackState(
            last_song_id="song-1",
            current_queue=[
                Song(
                    id="song-1",
                    title="Song 1",
                    uploader="A",
                    thumbnail="t",
                    duration=100,
                )
            ],
            recent_songs=[],
            last_playlist_id="playlist-1",
        )
        PlaybackService.upsert_playback_state(db, user_id="user-1", data=data)

        result = PlaybackService.get_playback_state(db, user_id="user-1")
        assert result["last_song_id"] == "song-1"
        assert len(result["current_queue"]) == 1
        assert result["current_queue"][0]["id"] == "song-1"
        assert result["last_playlist_id"] == "playlist-1"

    def test_updates_existing_state(self, db: Session) -> None:
        data1 = PlaybackState(
            last_song_id="song-1",
            current_queue=[
                Song(
                    id="song-1",
                    title="Song 1",
                    uploader="A",
                    thumbnail="t",
                    duration=100,
                )
            ],
        )
        PlaybackService.upsert_playback_state(db, user_id="user-1", data=data1)

        data2 = PlaybackState(
            last_song_id="song-2",
            current_queue=[
                Song(
                    id="song-2",
                    title="Song 2",
                    uploader="B",
                    thumbnail="t",
                    duration=200,
                )
            ],
            recent_songs=[
                Song(
                    id="song-1",
                    title="Song 1",
                    uploader="A",
                    thumbnail="t",
                    duration=100,
                )
            ],
        )
        PlaybackService.upsert_playback_state(db, user_id="user-1", data=data2)

        result = PlaybackService.get_playback_state(db, user_id="user-1")
        assert result["last_song_id"] == "song-2"
        assert len(result["current_queue"]) == 1
        assert result["current_queue"][0]["id"] == "song-2"
        assert len(result["recent_songs"]) == 1
        assert result["recent_songs"][0]["id"] == "song-1"

    def test_per_user_isolation(self, db: Session) -> None:
        data1 = PlaybackState(last_song_id="song-1")
        data2 = PlaybackState(last_song_id="song-2")

        PlaybackService.upsert_playback_state(db, user_id="user-1", data=data1)
        PlaybackService.upsert_playback_state(db, user_id="user-2", data=data2)

        result1 = PlaybackService.get_playback_state(db, user_id="user-1")
        result2 = PlaybackService.get_playback_state(db, user_id="user-2")
        assert result1["last_song_id"] == "song-1"
        assert result2["last_song_id"] == "song-2"

    def test_duplicate_song_in_queue_and_recent_is_deduped(
        self, db: Session
    ) -> None:
        song = Song(
            id="song-dup",
            title="Dup",
            uploader="A",
            thumbnail="t",
            duration=100,
        )
        data = PlaybackState(
            last_song_id="song-dup",
            current_queue=[song, song],
            recent_songs=[song],
        )
        PlaybackService.upsert_playback_state(db, user_id="user-1", data=data)

        result = PlaybackService.get_playback_state(db, user_id="user-1")
        assert len(result["current_queue"]) == 2
        assert len(result["recent_songs"]) == 1

    def test_reupsert_refreshes_zero_duration(self, db: Session) -> None:
        stale = Song(
            id="song-heal",
            title="Song",
            uploader="A",
            thumbnail="t",
            duration=0,
        )
        PlaybackService.upsert_playback_state(
            db,
            user_id="user-1",
            data=PlaybackState(last_song_id="song-heal", current_queue=[stale]),
        )

        fresh = Song(
            id="song-heal",
            title="Song (Remastered)",
            uploader="A",
            thumbnail="t",
            duration=245,
        )
        PlaybackService.upsert_playback_state(
            db,
            user_id="user-1",
            data=PlaybackState(last_song_id="song-heal", current_queue=[fresh]),
        )

        result = PlaybackService.get_playback_state(db, user_id="user-1")
        assert result["current_queue"][0]["duration"] == 245
        assert result["current_queue"][0]["title"] == "Song (Remastered)"
