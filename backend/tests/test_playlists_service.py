from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models.playlist import PlaylistModel, PlaylistVisibility
from app.db.models.user import UserModel
from app.schemas.song import PlaylistUpdate, Song
from app.services.playlists import PlaylistService
from app.services.songs import SongService
from app.services.ytmusic import ytmusic_service


@pytest.fixture(name="sample_song")
def sample_song() -> Song:
    return Song(
        id="song-1",
        title="Test Song",
        uploader="Test Artist",
        thumbnail="http://example.com/thumb.jpg",
        duration=180,
    )


def make_playlist(
    db: Session,
    name: str,
    user: UserModel,
    *,
    visibility: PlaylistVisibility = PlaylistVisibility.PRIVATE,
) -> PlaylistModel:
    playlist = PlaylistModel(name=name, user_id=user.id, visibility=visibility)
    db.add(playlist)
    db.commit()
    return playlist


def add_song(db: Session, playlist_id: str, song: Song, user: UserModel) -> None:
    PlaylistService.add_song_to_playlist(
        db, playlist_id_or_name=playlist_id, song=song, user=user
    )


class TestGetAllPlaylists:
    def test_empty_list(self, db: Session, test_user: UserModel) -> None:
        result = PlaylistService.get_all_playlists(db, test_user)
        assert result == []

    def test_returns_own_playlists(self, db: Session, test_user: UserModel) -> None:
        make_playlist(db, "My Playlist", test_user)

        result = PlaylistService.get_all_playlists(db, test_user)
        assert len(result) == 1
        assert result[0]["name"] == "My Playlist"
        assert result[0]["is_owner"] is True

    def test_excludes_private_playlists_from_others(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        make_playlist(db, "Other Private", admin_user)

        result = PlaylistService.get_all_playlists(db, test_user)
        assert result == []

    def test_includes_public_playlists_from_others(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        make_playlist(
            db, "Other Public", admin_user, visibility=PlaylistVisibility.PUBLIC
        )

        result = PlaylistService.get_all_playlists(db, test_user)
        assert [p["name"] for p in result] == ["Other Public"]
        assert result[0]["is_owner"] is False

    def test_sorts_by_name_asc(self, db: Session, test_user: UserModel) -> None:
        db.add_all(
            [
                PlaylistModel(name="Zeta", user_id=test_user.id),
                PlaylistModel(name="Alpha", user_id=test_user.id),
                PlaylistModel(name="Mid", user_id=test_user.id),
            ]
        )
        db.commit()

        result = PlaylistService.get_all_playlists(
            db, test_user, sort_by="name", order="asc"
        )
        assert [p["name"] for p in result] == ["Alpha", "Mid", "Zeta"]

    def test_sorts_by_name_desc(self, db: Session, test_user: UserModel) -> None:
        db.add_all(
            [
                PlaylistModel(name="Alpha", user_id=test_user.id),
                PlaylistModel(name="Mid", user_id=test_user.id),
                PlaylistModel(name="Zeta", user_id=test_user.id),
            ]
        )
        db.commit()

        result = PlaylistService.get_all_playlists(
            db, test_user, sort_by="name", order="desc"
        )
        assert [p["name"] for p in result] == ["Zeta", "Mid", "Alpha"]

    def test_sorts_by_created_at_desc(self, db: Session, test_user: UserModel) -> None:
        base = datetime(2024, 1, 1, tzinfo=UTC)
        older = PlaylistModel(name="Older", user_id=test_user.id)
        newer = PlaylistModel(name="Newer", user_id=test_user.id)
        older.created_at = base
        newer.created_at = base + timedelta(days=1)
        db.add_all([older, newer])
        db.commit()

        result = PlaylistService.get_all_playlists(
            db, test_user, sort_by="created_at", order="desc"
        )
        assert [p["name"] for p in result] == ["Newer", "Older"]


class TestDiscoverPlaylists:
    def test_returns_only_public_ordered_by_followers(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        make_playlist(db, "Private One", admin_user)
        popular = make_playlist(
            db, "Popular", admin_user, visibility=PlaylistVisibility.PUBLIC
        )
        niche = make_playlist(
            db, "Niche", admin_user, visibility=PlaylistVisibility.PUBLIC
        )
        popular.follower_count = 10
        niche.follower_count = 3
        db.commit()

        result = PlaylistService.get_discover_playlists(db, test_user)
        assert [p["name"] for p in result] == ["Popular", "Niche"]

    def test_excludes_own_playlists(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        make_playlist(db, "Mine", test_user, visibility=PlaylistVisibility.PUBLIC)
        make_playlist(db, "Theirs", admin_user, visibility=PlaylistVisibility.PUBLIC)

        result = PlaylistService.get_discover_playlists(db, test_user)
        assert [p["name"] for p in result] == ["Theirs"]

    def test_respects_limit(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        make_playlist(db, "One", admin_user, visibility=PlaylistVisibility.PUBLIC)
        make_playlist(db, "Two", admin_user, visibility=PlaylistVisibility.PUBLIC)

        result = PlaylistService.get_discover_playlists(db, test_user, limit=1)
        assert len(result) == 1


class TestFollowingPlaylists:
    def test_returns_followed_only(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        followed = make_playlist(
            db, "Followed", admin_user, visibility=PlaylistVisibility.PUBLIC
        )
        make_playlist(
            db, "Not Followed", admin_user, visibility=PlaylistVisibility.PUBLIC
        )
        PlaylistService.toggle_follow(db, playlist_id=followed.id, user=test_user)

        result = PlaylistService.get_following_playlists(db, test_user)
        assert [p["name"] for p in result] == ["Followed"]
        assert result[0]["is_following"] is True


class TestToggleFollow:
    def test_follow_and_unfollow(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        playlist = make_playlist(
            db, "Popular", admin_user, visibility=PlaylistVisibility.PUBLIC
        )

        result = PlaylistService.toggle_follow(
            db, playlist_id=playlist.id, user=test_user
        )
        assert result == {"is_following": True, "follower_count": 1}

        result = PlaylistService.toggle_follow(
            db, playlist_id=playlist.id, user=test_user
        )
        assert result == {"is_following": False, "follower_count": 0}

    def test_cannot_follow_private_playlist(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Private", admin_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.toggle_follow(db, playlist_id=playlist.id, user=test_user)
        assert exc_info.value.status_code == 404

    def test_cannot_follow_own_playlist(
        self, db: Session, test_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Mine", test_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.toggle_follow(db, playlist_id=playlist.id, user=test_user)
        assert exc_info.value.status_code == 400


class TestGetPlaylistById:
    def test_not_found_raises(self, db: Session) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.get_playlist_by_id(db, "nonexistent", None)
        assert exc_info.value.status_code == 404

    def test_returns_playlist(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        result = PlaylistService.get_playlist_by_id(db, playlist.id, test_user)
        assert result["name"] == "My Playlist"
        assert result["songs"] == []
        assert result["is_owner"] is True

    def test_private_playlist_requires_owner(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Secret", admin_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.get_playlist_by_id(db, playlist.id, test_user)
        assert exc_info.value.status_code == 404

    def test_admin_can_view_private_playlist(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Secret", test_user)

        result = PlaylistService.get_playlist_by_id(db, playlist.id, admin_user)
        assert result["name"] == "Secret"

    def test_sorts_songs_by_title(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Sorted", test_user)
        for title in ("Zulu", "Alpha", "Mike"):
            add_song(
                db,
                playlist.id,
                Song(
                    id=f"song-{title.lower()}",
                    title=title,
                    uploader="Artist",
                    thumbnail="",
                    duration=100,
                ),
                test_user,
            )

        result = PlaylistService.get_playlist_by_id(
            db, playlist.id, test_user, sort_by="title", order="asc"
        )
        assert [s["title"] for s in result["songs"]] == ["Alpha", "Mike", "Zulu"]

        result = PlaylistService.get_playlist_by_id(
            db, playlist.id, test_user, sort_by="title", order="desc"
        )
        assert [s["title"] for s in result["songs"]] == ["Zulu", "Mike", "Alpha"]

    def test_sorts_songs_by_uploader(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Sorted", test_user)
        for song_id, uploader in (("s1", "Bravo"), ("s2", "Alpha"), ("s3", "Charlie")):
            add_song(
                db,
                playlist.id,
                Song(
                    id=song_id,
                    title="Song",
                    uploader=uploader,
                    thumbnail="",
                    duration=100,
                ),
                test_user,
            )

        result = PlaylistService.get_playlist_by_id(
            db, playlist.id, test_user, sort_by="uploader", order="asc"
        )
        assert [s["uploader"] for s in result["songs"]] == ["Alpha", "Bravo", "Charlie"]

    def test_sorts_songs_by_duration(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Sorted", test_user)
        for song_id, duration in (("s1", 300), ("s2", 100), ("s3", 200)):
            add_song(
                db,
                playlist.id,
                Song(
                    id=song_id,
                    title="Song",
                    uploader="Artist",
                    thumbnail="",
                    duration=duration,
                ),
                test_user,
            )

        result = PlaylistService.get_playlist_by_id(
            db, playlist.id, test_user, sort_by="duration", order="asc"
        )
        assert [s["duration"] for s in result["songs"]] == [100, 200, 300]


class TestCreatePlaylist:
    def test_creates_new(self, db: Session, test_user: UserModel) -> None:
        result = PlaylistService.create_playlist(
            db, user=test_user, name="New Playlist"
        )
        assert result["message"] == "Playlist created"
        assert result["name"] == "New Playlist"

    def test_default_visibility_private(
        self, db: Session, test_user: UserModel
    ) -> None:
        PlaylistService.create_playlist(db, user=test_user, name="New Playlist")
        playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.name == "New Playlist").first()
        )
        assert playlist is not None
        assert playlist.visibility == PlaylistVisibility.PRIVATE
        assert playlist.user_id == test_user.id

    def test_idempotent_per_user(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        PlaylistService.create_playlist(db, user=test_user, name="Existing")
        result = PlaylistService.create_playlist(db, user=test_user, name="Existing")
        assert result["message"] == "Playlist already exists"

        result = PlaylistService.create_playlist(db, user=admin_user, name="Existing")
        assert result["message"] == "Playlist created"


class TestUpdatePlaylist:
    def test_updates(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Old Name", test_user)

        result = PlaylistService.update_playlist(
            db,
            playlist_id=playlist.id,
            user=test_user,
            data=PlaylistUpdate(
                name="New Name",
                description="A description",
                visibility=PlaylistVisibility.PUBLIC,
            ),
        )
        assert result["message"] == "Playlist updated"
        assert result["name"] == "New Name"
        assert result["visibility"] == PlaylistVisibility.PUBLIC
        assert result["description"] == "A description"

    def test_not_found_raises(self, db: Session, test_user: UserModel) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.update_playlist(
                db,
                playlist_id="nonexistent",
                user=test_user,
                data=PlaylistUpdate(name="New"),
            )
        assert exc_info.value.status_code == 404

    def test_non_owner_raises(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        intruder = UserModel(
            id="intruder-id",
            email="intruder@example.com",
            username="intruder",
            role="user",
            is_active=True,
        )
        db.add(intruder)
        db.commit()
        playlist = make_playlist(db, "Mine", test_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.update_playlist(
                db,
                playlist_id=playlist.id,
                user=intruder,
                data=PlaylistUpdate(name="Stolen"),
            )
        assert exc_info.value.status_code == 403

    def test_duplicate_name_raises(self, db: Session, test_user: UserModel) -> None:
        make_playlist(db, "Name 1", test_user)
        p2 = make_playlist(db, "Name 2", test_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.update_playlist(
                db,
                playlist_id=p2.id,
                user=test_user,
                data=PlaylistUpdate(name="Name 1"),
            )
        assert exc_info.value.status_code == 400


class TestDeletePlaylist:
    def test_deletes(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "To Delete", test_user)

        result = PlaylistService.delete_playlist(
            db, playlist_id=playlist.id, user=test_user
        )
        assert result["message"] == "Playlist deleted"

    def test_not_found_raises(self, db: Session, test_user: UserModel) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.delete_playlist(
                db, playlist_id="nonexistent", user=test_user
            )
        assert exc_info.value.status_code == 404

    def test_non_owner_raises(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        intruder = UserModel(
            id="intruder-id",
            email="intruder@example.com",
            username="intruder",
            role="user",
            is_active=True,
        )
        db.add(intruder)
        db.commit()
        playlist = make_playlist(db, "Mine", test_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.delete_playlist(db, playlist_id=playlist.id, user=intruder)
        assert exc_info.value.status_code == 403


class TestAddSongToPlaylist:
    def test_adds_song(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        result = PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song, user=test_user
        )
        assert result["message"] == "Song added"

    def test_creates_playlist_if_not_exists(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        result = PlaylistService.add_song_to_playlist(
            db,
            playlist_id_or_name="New Playlist",
            song=sample_song,
            user=test_user,
        )
        assert result["message"] == "Song added"
        playlist = (
            db.query(PlaylistModel).filter(PlaylistModel.name == "New Playlist").first()
        )
        assert playlist is not None
        assert playlist.user_id == test_user.id

    def test_cannot_add_to_others_playlist(
        self,
        db: Session,
        test_user: UserModel,
        admin_user: UserModel,
        sample_song: Song,
    ) -> None:
        playlist = make_playlist(db, "Mine", admin_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.add_song_to_playlist(
                db, playlist_id_or_name=playlist.id, song=sample_song, user=test_user
            )
        assert exc_info.value.status_code == 403

    def test_idempotent_add(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song, user=test_user
        )
        result = PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song, user=test_user
        )
        assert result["message"] == "Song already in playlist"


class TestRemoveSongFromPlaylist:
    def test_removes_song(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "My Playlist", test_user)

        PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song, user=test_user
        )
        result = PlaylistService.remove_song_from_playlist(
            db, playlist_id=playlist.id, song_id=sample_song.id, user=test_user
        )
        assert result["message"] == "Song removed from playlist"

    def test_not_found_playlist_raises(self, db: Session, test_user: UserModel) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.remove_song_from_playlist(
                db, playlist_id="nonexistent", song_id="song-1", user=test_user
            )
        assert exc_info.value.status_code == 404


class TestUpsertSong:
    def test_creates_song(self, db: Session, sample_song: Song) -> None:
        db_song = SongService.upsert_song(db, sample_song)
        assert db_song.id == sample_song.id
        assert db_song.title == sample_song.title

    def test_idempotent(self, db: Session, sample_song: Song) -> None:
        s1 = SongService.upsert_song(db, sample_song)
        s2 = SongService.upsert_song(db, sample_song)
        assert s1.id == s2.id


class TestGetPlaylistPagination:
    def test_returns_page_and_total(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Paginated", test_user)

        for i in range(3):
            add_song(
                db,
                playlist.id,
                Song(
                    id=f"song-{i}",
                    title=f"Song {i}",
                    uploader="Artist",
                    thumbnail="",
                    duration=100,
                ),
                test_user,
            )

        result = PlaylistService.get_playlist_by_id(
            db, playlist.id, test_user, page=1, page_size=2
        )
        assert result["total"] == 3
        assert len(result["songs"]) == 2

        second_page = PlaylistService.get_playlist_by_id(
            db, playlist.id, test_user, page=2, page_size=2
        )
        assert len(second_page["songs"]) == 1


class TestRelatedSongs:
    def test_returns_same_uploader_only(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "Related", test_user)

        same_artist = Song(
            id="song-2",
            title="Other Track",
            uploader="Test Artist",
            thumbnail="",
            duration=200,
        )
        different_artist = Song(
            id="song-3",
            title="Other Artist Track",
            uploader="Someone Else",
            thumbnail="",
            duration=220,
        )
        add_song(db, playlist.id, sample_song, test_user)
        add_song(db, playlist.id, same_artist, test_user)
        add_song(db, playlist.id, different_artist, test_user)

        related = SongService.get_related_songs(db, sample_song.id)
        ids = [song["id"] for song in related]
        assert "song-2" in ids
        assert "song-3" not in ids

    def test_unknown_song_returns_empty(self, db: Session) -> None:
        assert SongService.get_related_songs(db, "nonexistent") == []

    def test_endpoint_tops_up_with_ytmusic_when_db_is_short(
        self,
        client: TestClient,
        db: Session,
        test_user: UserModel,
        sample_song: Song,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        playlist = make_playlist(db, "Related", test_user)
        add_song(db, playlist.id, sample_song, test_user)

        yt_song = {
            "id": "yt-1",
            "title": "YT Suggestion",
            "uploader": "Some Artist",
            "thumbnail": "yt.jpg",
            "duration": 210,
        }
        monkeypatch.setattr(
            ytmusic_service,
            "related_songs",
            lambda video_id, limit: [yt_song],
        )

        response = client.get("/api/v1/songs/song-1/related", params={"limit": 6})
        assert response.status_code == 200
        related = response.json()
        assert len(related) == 1
        assert related[0]["id"] == "yt-1"

    def test_endpoint_uses_db_results_without_ytmusic_fallback(
        self,
        client: TestClient,
        db: Session,
        test_user: UserModel,
        sample_song: Song,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        playlist = make_playlist(db, "Related", test_user)
        same_artist = Song(
            id="song-2",
            title="Other Track",
            uploader="Test Artist",
            thumbnail="",
            duration=200,
        )
        add_song(db, playlist.id, sample_song, test_user)
        add_song(db, playlist.id, same_artist, test_user)

        def fail(*args: object, **kwargs: object) -> None:
            raise AssertionError("fallback")

        monkeypatch.setattr(ytmusic_service, "related_songs", fail)

        response = client.get("/api/v1/songs/song-1/related", params={"limit": 1})
        assert response.status_code == 200
        related = response.json()
        ids = [song["id"] for song in related]
        assert ids == ["song-2"]


def make_user(db: Session, user_id: str, username: str) -> UserModel:
    user = UserModel(
        id=user_id,
        email=f"{username}@example.com",
        username=username,
        display_name=username.title(),
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


class TestToggleCollaborative:
    def test_toggles(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        assert playlist.is_collaborative is False

        result = PlaylistService.toggle_collaborative(
            db, playlist_id=playlist.id, user=test_user
        )
        assert result["is_collaborative"] is True

        result = PlaylistService.toggle_collaborative(
            db, playlist_id=playlist.id, user=test_user
        )
        assert result["is_collaborative"] is False

    def test_not_found_raises(self, db: Session, test_user: UserModel) -> None:
        with pytest.raises(Exception) as exc_info:
            PlaylistService.toggle_collaborative(
                db, playlist_id="missing", user=test_user
            )
        assert exc_info.value.status_code == 404

    def test_non_owner_raises(
        self, db: Session, test_user: UserModel, admin_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Mine", test_user)
        intruder = make_user(db, "intruder-id", "intruder")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.toggle_collaborative(
                db, playlist_id=playlist.id, user=intruder
            )
        assert exc_info.value.status_code == 403

        result = PlaylistService.toggle_collaborative(
            db, playlist_id=playlist.id, user=admin_user
        )
        assert result["is_collaborative"] is True


class TestAddCollaborator:
    def test_adds(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")

        result = PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="editor",
            user=test_user,
        )
        assert result["message"] == "Collaborator added"

        collabs = PlaylistService.get_collaborators(
            db, playlist_id=playlist.id, user=test_user
        )
        assert len(collabs) == 1
        assert collabs[0]["user_id"] == other.id
        assert collabs[0]["role"] == "editor"

    def test_upserts_existing_role(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")
        PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="editor",
            user=test_user,
        )

        result = PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="viewer",
            user=test_user,
        )
        assert result["message"] == "Collaborator updated"
        collabs = PlaylistService.get_collaborators(
            db, playlist_id=playlist.id, user=test_user
        )
        assert collabs[0]["role"] == "viewer"

    def test_owner_cannot_be_added(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.add_collaborator(
                db,
                playlist_id=playlist.id,
                user_id=test_user.id,
                role="editor",
                user=test_user,
            )
        assert exc_info.value.status_code == 400

    def test_unknown_user_raises(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)

        with pytest.raises(Exception) as exc_info:
            PlaylistService.add_collaborator(
                db,
                playlist_id=playlist.id,
                user_id="missing-user",
                role="editor",
                user=test_user,
            )
        assert exc_info.value.status_code == 404

    def test_non_owner_raises(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        intruder = make_user(db, "intruder-id", "intruder")
        other = make_user(db, "other-id", "other")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.add_collaborator(
                db,
                playlist_id=playlist.id,
                user_id=other.id,
                role="editor",
                user=intruder,
            )
        assert exc_info.value.status_code == 403


class TestRemoveCollaborator:
    def test_removes(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")
        PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="editor",
            user=test_user,
        )

        result = PlaylistService.remove_collaborator(
            db, playlist_id=playlist.id, user_id=other.id, user=test_user
        )
        assert result["message"] == "Collaborator removed"
        assert (
            PlaylistService.get_collaborators(
                db, playlist_id=playlist.id, user=test_user
            )
            == []
        )

    def test_unknown_collaborator_raises(
        self, db: Session, test_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.remove_collaborator(
                db, playlist_id=playlist.id, user_id=other.id, user=test_user
            )
        assert exc_info.value.status_code == 404

    def test_non_owner_raises(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        other = make_user(db, "other-id", "other")
        intruder = make_user(db, "intruder-id", "intruder")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.remove_collaborator(
                db, playlist_id=playlist.id, user_id=other.id, user=intruder
            )
        assert exc_info.value.status_code == 403


class TestGetCollaborators:
    def test_requires_owner_or_editor(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(
            db, "Collab", test_user, visibility=PlaylistVisibility.PUBLIC
        )
        other = make_user(db, "other-id", "other")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.get_collaborators(db, playlist_id=playlist.id, user=other)
        assert exc_info.value.status_code == 403

    def test_private_playlist_hidden_from_non_owner(
        self, db: Session, test_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Private Collab", test_user)
        other = make_user(db, "other-id", "other")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.get_collaborators(db, playlist_id=playlist.id, user=other)
        assert exc_info.value.status_code in (403, 404)

    def test_editor_can_list(self, db: Session, test_user: UserModel) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        playlist.is_collaborative = True
        db.commit()
        other = make_user(db, "other-id", "other")
        PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="editor",
            user=test_user,
        )

        collabs = PlaylistService.get_collaborators(
            db, playlist_id=playlist.id, user=other
        )
        assert len(collabs) == 1


class TestCollaborativeEditing:
    def test_editor_can_add_song(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        playlist.is_collaborative = True
        db.commit()
        other = make_user(db, "other-id", "other")
        PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="editor",
            user=test_user,
        )

        result = PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song, user=other
        )
        assert result["message"] == "Song added"

    def test_viewer_cannot_add_song(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        playlist.is_collaborative = True
        db.commit()
        other = make_user(db, "other-id", "other")
        PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="viewer",
            user=test_user,
        )

        with pytest.raises(Exception) as exc_info:
            PlaylistService.add_song_to_playlist(
                db, playlist_id_or_name=playlist.id, song=sample_song, user=other
            )
        assert exc_info.value.status_code == 403

    def test_editor_can_remove_song(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        playlist.is_collaborative = True
        db.commit()
        other = make_user(db, "other-id", "other")
        PlaylistService.add_collaborator(
            db,
            playlist_id=playlist.id,
            user_id=other.id,
            role="editor",
            user=test_user,
        )
        PlaylistService.add_song_to_playlist(
            db, playlist_id_or_name=playlist.id, song=sample_song, user=test_user
        )

        result = PlaylistService.remove_song_from_playlist(
            db, playlist_id=playlist.id, song_id=sample_song.id, user=other
        )
        assert result["message"] == "Song removed from playlist"

    def test_non_collaborator_raises(
        self, db: Session, test_user: UserModel, sample_song: Song
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        playlist.is_collaborative = True
        db.commit()
        other = make_user(db, "other-id", "other")

        with pytest.raises(Exception) as exc_info:
            PlaylistService.add_song_to_playlist(
                db, playlist_id_or_name=playlist.id, song=sample_song, user=other
            )
        assert exc_info.value.status_code == 403

    def test_serialize_exposes_collaboration_fields(
        self, db: Session, test_user: UserModel
    ) -> None:
        playlist = make_playlist(db, "Collab", test_user)
        playlist.is_collaborative = True
        db.commit()

        result = PlaylistService.get_playlist_by_id(db, playlist.id, test_user)
        assert result["is_collaborative"] is True
        assert result["is_editor"] is True
