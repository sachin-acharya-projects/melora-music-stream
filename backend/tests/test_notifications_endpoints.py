from sqlalchemy.orm import Session

from app.db.models.notification import NotificationModel
from app.db.models.user import UserModel
from app.services.notifications import notification_service

BASE = "/api/v1/notifications"


def seed_notifications(db: Session, user_id: str, count: int = 3) -> None:
    for i in range(count):
        db.add(
            NotificationModel(
                user_id=user_id,
                channel="in_app",
                type="new_release",
                title=f"Notification {i}",
            )
        )
    db.commit()


class TestListNotifications:
    def test_unauthenticated(self, client) -> None:
        response = client.get(f"{BASE}/")
        assert response.status_code == 401

    def test_returns_notifications(self, client, test_user: UserModel, auth_headers, db: Session) -> None:
        seed_notifications(db, test_user.id, count=2)
        response = client.get(f"{BASE}/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["unread_count"] == 2
        assert len(data["items"]) == 2
        assert data["items"][0]["title"] == "Notification 1"
        assert data["items"][0]["is_read"] is False

    def test_respects_limit(self, client, test_user: UserModel, auth_headers, db: Session) -> None:
        seed_notifications(db, test_user.id, count=3)
        response = client.get(f"{BASE}/?limit=1", headers=auth_headers)
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 1

    def test_scoped_to_current_user(self, client, test_user: UserModel, auth_headers, db: Session) -> None:
        other = UserModel(
            id="other-user",
            email="other@example.com",
            username="other",
            role="USER",
            is_active=True,
        )
        db.add(other)
        db.commit()
        seed_notifications(db, test_user.id, count=1)
        seed_notifications(db, other.id, count=5)
        response = client.get(f"{BASE}/", headers=auth_headers)
        data = response.json()
        assert data["total"] == 1


class TestUnreadCount:
    def test_returns_count(self, client, test_user: UserModel, auth_headers, db: Session) -> None:
        seed_notifications(db, test_user.id, count=2)
        response = client.get(f"{BASE}/unread-count", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["unread_count"] == 2


class TestMarkRead:
    def test_marks_single_read(self, client, test_user: UserModel, auth_headers, db: Session) -> None:
        seed_notifications(db, test_user.id, count=1)
        row = db.query(NotificationModel).first()
        response = client.post(f"{BASE}/{row.id}/read", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        db.refresh(row)
        assert row.is_read is True
        assert row.read_at is not None

    def test_unknown_id_returns_not_ok(self, client, auth_headers) -> None:
        response = client.post(f"{BASE}/missing-id/read", headers=auth_headers)
        assert response.json()["ok"] is False


class TestMarkAllRead:
    def test_marks_all_read(self, client, test_user: UserModel, auth_headers, db: Session) -> None:
        seed_notifications(db, test_user.id, count=3)
        response = client.post(f"{BASE}/read-all", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["updated"] == 3
        assert notification_service.unread_count(db, user_id=test_user.id) == 0


class TestNotificationSettings:
    def test_get_defaults(self, client, auth_headers) -> None:
        response = client.get(f"{BASE}/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["new_release"]["in_app"] is True

    def test_update_settings(self, client, auth_headers) -> None:
        response = client.patch(
            f"{BASE}/settings",
            json={"new_release": {"email": True}},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["new_release"]["email"] is True
