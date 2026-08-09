from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.db.models.artist import ArtistModel
from app.db.models.notification import NotificationModel
from app.db.models.release import ReleaseModel
from app.db.models.user import UserModel
from app.services.notifications.providers import (
    InAppProvider,
    NotificationPayload,
    get_active_providers,
)
from app.services.notifications.service import (
    default_notification_settings,
    notification_service,
)
from app.services.releases import ReleaseService


def make_artist(db: Session, name: str) -> ArtistModel:
    artist = ArtistModel(
        id=f"artist-{name.lower()}",
        name=name,
        slug=name.lower(),
        external_ids={"youtube_channel_id": f"yt-{name.lower()}"},
    )
    db.add(artist)
    db.commit()
    return artist


def follow_artist(db: Session, artist: ArtistModel, user: UserModel) -> None:
    artist.followers.append(user)
    artist.follower_count = (artist.follower_count or 0) + 1
    db.commit()


def add_release(db: Session, artist: ArtistModel, title: str) -> ReleaseModel:
    release = ReleaseModel(
        id=f"release-{artist.slug}-{title.lower().replace(' ', '-')}",
        artist_id=artist.id,
        release_type="album",
        title=title,
        release_date=datetime.now(UTC) - timedelta(days=2),
        year=2026,
        browse_id=f"browse-{artist.slug}-{len(title)}",
    )
    db.add(release)
    db.commit()
    return release


class TestNotificationSettings:
    def test_defaults(self, db: Session, test_user: UserModel) -> None:
        settings = notification_service.get_settings(test_user)
        assert settings == default_notification_settings()
        assert settings["new_release"]["in_app"] is True

    def test_update_settings_merges_partial(self, db: Session, test_user: UserModel) -> None:
        updated = notification_service.update_settings(
            db,
            user=test_user,
            settings={"new_release": {"email": True}},
        )
        assert updated["new_release"]["email"] is True
        assert updated["new_release"]["in_app"] is True
        assert updated["new_release"]["push"] is False

    def test_update_settings_ignores_non_boolean(self, db: Session, test_user: UserModel) -> None:
        updated = notification_service.update_settings(
            db,
            user=test_user,
            settings={"new_release": {"email": "yes", "push": 1}},
        )
        assert updated["new_release"]["email"] is False
        assert updated["new_release"]["push"] is False

    def test_settings_are_persisted(self, db: Session, test_user: UserModel) -> None:
        notification_service.update_settings(
            db, user=test_user, settings={"new_release": {"push": True}}
        )
        db.refresh(test_user)
        assert notification_service.get_settings(test_user)["new_release"]["push"] is True


class TestDispatch:
    def test_dispatch_persists_in_app_notification(
        self, db: Session, test_user: UserModel
    ) -> None:
        notification_service.dispatch(
            db,
            user=test_user,
            event_type="new_release",
            title="New from Artist",
            message="Artist released a thing",
            data={"release_id": "r1", "artist_id": "a1"},
        )
        rows = db.query(NotificationModel).all()
        assert len(rows) == 1
        notification = rows[0]
        assert notification.user_id == test_user.id
        assert notification.channel == "in_app"
        assert notification.type == "new_release"
        assert notification.title == "New from Artist"
        assert notification.data == {"release_id": "r1", "artist_id": "a1"}
        assert notification.is_read is False

    def test_dispatch_respects_disabled_channel(
        self, db: Session, test_user: UserModel
    ) -> None:
        notification_service.update_settings(
            db, user=test_user, settings={"new_release": {"in_app": False}}
        )
        notification_service.dispatch(
            db,
            user=test_user,
            event_type="new_release",
            title="New from Artist",
        )
        assert db.query(NotificationModel).count() == 0


class TestInbox:
    def test_list_newest_first(self, db: Session, test_user: UserModel) -> None:
        for i in range(3):
            notification_service.dispatch(
                db,
                user=test_user,
                event_type="new_release",
                title=f"Notification {i}",
            )
        notifications = notification_service.list_for_user(db, user_id=test_user.id)
        titles = [n.title for n in notifications]
        assert titles == ["Notification 2", "Notification 1", "Notification 0"]

    def test_list_scoped_to_user(self, db: Session, test_user: UserModel) -> None:
        other = UserModel(
            id="other-user",
            email="other@example.com",
            username="other",
            role="USER",
            is_active=True,
        )
        db.add(other)
        db.commit()
        notification_service.dispatch(db, user=other, event_type="new_release", title="Other's")
        notification_service.dispatch(db, user=test_user, event_type="new_release", title="Mine")

        notifications = notification_service.list_for_user(db, user_id=test_user.id)
        assert [n.title for n in notifications] == ["Mine"]

    def test_unread_count(self, db: Session, test_user: UserModel) -> None:
        notification_service.dispatch(db, user=test_user, event_type="new_release", title="A")
        notification_service.dispatch(db, user=test_user, event_type="new_release", title="B")
        row = db.query(NotificationModel).order_by(NotificationModel.created_at).first()
        assert notification_service.unread_count(db, user_id=test_user.id) == 2
        notification_service.mark_read(db, user_id=test_user.id, notification_id=row.id)
        assert notification_service.unread_count(db, user_id=test_user.id) == 1

    def test_mark_read_returns_none_for_other_users_notification(
        self, db: Session, test_user: UserModel
    ) -> None:
        other = UserModel(
            id="other-user",
            email="other@example.com",
            username="other",
            role="USER",
            is_active=True,
        )
        db.add(other)
        db.commit()
        notification_service.dispatch(db, user=other, event_type="new_release", title="A")
        row = db.query(NotificationModel).first()
        assert notification_service.mark_read(db, user_id=test_user.id, notification_id=row.id) is None
        assert row.is_read is False

    def test_mark_all_read(self, db: Session, test_user: UserModel) -> None:
        for i in range(3):
            notification_service.dispatch(
                db, user=test_user, event_type="new_release", title=f"N{i}"
            )
        assert notification_service.mark_all_read(db, user_id=test_user.id) == 3
        assert notification_service.unread_count(db, user_id=test_user.id) == 0


class TestProviders:
    def test_in_app_provider_persists(self, db: Session, test_user: UserModel) -> None:
        InAppProvider().send(
            db,
            NotificationPayload(
                event_type="new_release",
                user_id=test_user.id,
                title="Hi",
                message="There",
                data={"a": 1},
            ),
        )
        db.commit()
        row = db.query(NotificationModel).one()
        assert row.title == "Hi"
        assert row.data == {"a": 1}

    def test_get_active_providers_includes_in_app(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("app.core.config.settings.EMAIL_NOTIFICATIONS_ENABLED", False)
        monkeypatch.setattr("app.core.config.settings.FCM_NOTIFICATIONS_ENABLED", False)
        channels = [p.channel for p in get_active_providers()]
        assert channels == ["in_app"]

    def test_get_active_providers_includes_email_and_fcm_when_enabled(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr("app.core.config.settings.EMAIL_NOTIFICATIONS_ENABLED", True)
        monkeypatch.setattr("app.core.config.settings.FCM_NOTIFICATIONS_ENABLED", True)
        channels = [p.channel for p in get_active_providers()]
        assert set(channels) == {"in_app", "email", "fcm"}


class TestReleaseNotifications:
    def test_notify_new_releases_creates_notification(
        self, db: Session, test_user: UserModel
    ) -> None:
        artist = make_artist(db, "Radiohead")
        follow_artist(db, artist, test_user)
        add_release(db, artist, "Kid A")

        created = ReleaseService.notify_new_releases(db, user=test_user)
        assert created == 1
        notification = db.query(NotificationModel).one()
        assert notification.type == "new_release"
        assert notification.title == "New from Radiohead"
        assert notification.data["release_id"].startswith("release-radiohead")

    def test_notify_new_releases_is_idempotent(
        self, db: Session, test_user: UserModel
    ) -> None:
        artist = make_artist(db, "Radiohead")
        follow_artist(db, artist, test_user)
        add_release(db, artist, "Kid A")

        ReleaseService.notify_new_releases(db, user=test_user)
        second_run = ReleaseService.notify_new_releases(db, user=test_user)
        assert second_run == 0
        assert db.query(NotificationModel).count() == 1

    def test_no_notification_for_unfollowed_artist(
        self, db: Session, test_user: UserModel
    ) -> None:
        artist = make_artist(db, "Radiohead")
        add_release(db, artist, "Kid A")

        created = ReleaseService.notify_new_releases(db, user=test_user)
        assert created == 0
        assert db.query(NotificationModel).count() == 0
