import pytest
from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel
from app.schemas.song import Song
from app.services.playlists import PlaylistService


@pytest.fixture(name="sample_song")
def sample_song() -> Song:
    return Song(
        id="song-1",
        title="Test Song",
        uploader="Test Artist",
        thumbnail="http://example.com/thumb.jpg",
        duration=180,
    )


class TestGetAllPlaylists:
    def test_empty_list(self, db: Session) -> None:
        result = PlaylistService.get_all_playlists(db)
        assert result == []

    def test_returns_playlists(self, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        result = PlaylistService.get_all_playlists(db)
        assert len(result) == 1
        assert result[0]["name"] == "My Playlist"


class TestGetPlaylistById:
    def test_not_found_raises(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.get_playlist_by_id(db, "nonexistent")
        assert exc_info.value.status_code == 404

    def test_returns_playlist(self, db: Session) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        result = PlaylistService.get_playlist_by_id(db, playlist.id)
        assert result["name"] == "My Playlist"
        assert result["songs"] == []


class TestCreatePlaylist:
    def test_creates_new(self, db: Session) -> None:
        result = PlaylistService.create_playlist(db, name="New Playlist")
        assert result["message"] == "Playlist created"
        assert result["name"] == "New Playlist"

    def test_idempotent(self, db: Session) -> None:
        PlaylistService.create_playlist(db, name="Existing")
        result = PlaylistService.create_playlist(db, name="Existing")
        assert result["message"] == "Playlist already exists"


class TestUpdatePlaylistName:
    def test_updates(self, db: Session) -> None:
        playlist = PlaylistModel(name="Old Name")
        db.add(playlist)
        db.commit()

        result = PlaylistService.update_playlist_name(db, playlist_id=playlist.id, new_name="New Name")
        assert result["message"] == "Playlist updated"
        assert result["name"] == "New Name"

    def test_not_found_raises(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.update_playlist_name(db, playlist_id="nonexistent", new_name="New")
        assert exc_info.value.status_code == 404

    def test_duplicate_name_raises(self, db: Session) -> None:
        p1 = PlaylistModel(name="Name 1")
        p2 = PlaylistModel(name="Name 2")
        db.add_all([p1, p2])
        db.commit()

        with pytest.raises(Exception) as exc_info:
            PlaylistService.update_playlist_name(db, playlist_id=p2.id, new_name="Name 1")
        assert exc_info.value.status_code == 400


class TestDeletePlaylist:
    def test_deletes(self, db: Session) -> None:
        playlist = PlaylistModel(name="To Delete")
        db.add(playlist)
        db.commit()

        result = PlaylistService.delete_playlist(db, playlist_id=playlist.id)
        assert result["message"] == "Playlist deleted"

    def test_not_found_raises(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.delete_playlist(db, playlist_id="nonexistent")
        assert exc_info.value.status_code == 404


class TestAddSongToPlaylist:
    def test_adds_song(self, db: Session, sample_song: Song) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        result = PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song
        )
        assert result["message"] == "Song added"

    def test_creates_playlist_if_not_exists(self, db: Session, sample_song: Song) -> None:
        result = PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name="New Playlist", song=sample_song
        )
        assert result["message"] == "Song added"

    def test_idempotent_add(self, db: Session, sample_song: Song) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        PlaylistService.add_song_to_playlist(db, playlist_id_or_name=playlist.id, song=sample_song)
        result = PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song
        )
        assert result["message"] == "Song already in playlist"


class TestRemoveSongFromPlaylist:
    def test_removes_song(self, db: Session, sample_song: Song) -> None:
        playlist = PlaylistModel(name="My Playlist")
        db.add(playlist)
        db.commit()

        PlaylistService.add_song_to_playlist(db, playlist_id_or_name=playlist.id, song=sample_song)
        result = PlaylistService.remove_song_from_playlist(
            db, playlist_id=playlist.id, song_id=sample_song.id
        )
        assert result["message"] == "Song removed from playlist"

    def test_not_found_playlist_raises(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.remove_song_from_playlist(
                db, playlist_id="nonexistent", song_id="song-1"
            )
        assert exc_info.value.status_code == 404


class TestUpsertSong:
    def test_creates_song(self, db: Session, sample_song: Song) -> None:
        db_song = PlaylistService.upsert_song(db, sample_song)
        assert db_song.id == sample_song.id
        assert db_song.title == sample_song.title

    def test_idempotent(self, db: Session, sample_song: Song) -> None:
        s1 = PlaylistService.upsert_song(db, sample_song)
        s2 = PlaylistService.upsert_song(db, sample_song)
        assert s1.id == s2.id
