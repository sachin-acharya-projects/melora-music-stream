"""Notification service: settings, dispatch, and inbox management."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from app.db.models.notification import NotificationModel
from app.services.notifications.providers import (
    NotificationPayload,
    get_active_providers,
)

if TYPE_CHECKING:
    from app.db.models.user import UserModel

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

DEFAULT_EVENT_SETTINGS: dict[str, dict[str, bool]] = {
    "new_release": {
        "in_app": True,
        "email": False,
        "push": False,
    }
}

CHANNEL_KEYS = ("in_app", "email", "push")


def default_notification_settings() -> dict[str, dict[str, bool]]:
    """Deep-copy the default per-event channel settings."""
    return {
        event: dict(channels) for event, channels in DEFAULT_EVENT_SETTINGS.items()
    }


class NotificationService:
    """Create and query user notifications."""

    @staticmethod
    def get_settings(user: UserModel) -> dict[str, dict[str, bool]]:
        """Return the user's per-event channel toggles, merged with defaults."""
        stored = user.notification_settings or {}
        merged = default_notification_settings()
        for event, channels in stored.items():
            if not isinstance(channels, dict):
                continue
            merged.setdefault(event, {})
            for key in CHANNEL_KEYS:
                if isinstance(channels.get(key), bool):
                    merged[event][key] = channels[key]
        return merged

    @staticmethod
    def update_settings(
        db: Session, *, user: UserModel, settings: dict[str, Any]
    ) -> dict[str, dict[str, bool]]:
        """Apply a partial update of the user's notification settings."""
        current = NotificationService.get_settings(user)
        for event, channels in settings.items():
            if not isinstance(channels, dict):
                continue
            current.setdefault(event, {})
            for key in CHANNEL_KEYS:
                if isinstance(channels.get(key), bool):
                    current[event][key] = channels[key]
        user.notification_settings = current
        db.commit()
        db.refresh(user)
        return NotificationService.get_settings(user)

    @staticmethod
    def dispatch(
        db: Session,
        *,
        user: UserModel,
        event_type: str,
        title: str,
        message: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Send a notification to every channel the user has enabled.

        The in-app channel is delivered by persisting a row; email/FCM are only
        attempted when both the config flag and the user's per-channel toggle
        allow them. Failures are contained per provider.
        """
        user_settings = NotificationService.get_settings(user).get(event_type, {})
        payload = NotificationPayload(
            event_type=event_type,
            user_id=user.id,
            title=title,
            message=message,
            data=data,
        )
        for provider in get_active_providers():
            channel_key = "push" if provider.channel == "fcm" else provider.channel
            if not user_settings.get(channel_key, False):
                continue
            try:
                provider.send(db, payload)
                db.commit()
            except Exception:
                db.rollback()
                logger.warning(
                    "Notification %s/%s failed for user %s",
                    provider.channel,
                    event_type,
                    user.id,
                    exc_info=True,
                )

    @staticmethod
    def list_for_user(
        db: Session,
        *,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[NotificationModel]:
        """Return the user's in-app notifications, newest first."""
        return (
            db.query(NotificationModel)
            .filter(NotificationModel.user_id == user_id)
            .order_by(NotificationModel.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def unread_count(db: Session, *, user_id: str) -> int:
        """Number of unread in-app notifications."""
        return (
            db.query(NotificationModel)
            .filter(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read.is_(False),
            )
            .count()
        )

    @staticmethod
    def mark_read(
        db: Session, *, user_id: str, notification_id: str
    ) -> NotificationModel | None:
        """Mark a single in-app notification read (scoped to the user)."""
        notification = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.id == notification_id,
                NotificationModel.user_id == user_id,
            )
            .first()
        )
        if notification is None:
            return None
        notification.is_read = True
        notification.read_at = notification.read_at or _utcnow()
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_read(db: Session, *, user_id: str) -> int:
        """Mark every unread in-app notification read; returns count updated."""
        updated = (
            db.query(NotificationModel)
            .filter(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read.is_(False),
            )
            .update(
                {
                    NotificationModel.is_read: True,
                    NotificationModel.read_at: _utcnow(),
                }
            )
        )
        db.commit()
        return updated


def _utcnow() -> datetime:
    return datetime.now(UTC)


notification_service = NotificationService()
