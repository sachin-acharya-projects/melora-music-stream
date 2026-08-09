"""Notification delivery providers.

Each provider implements :class:`NotificationProvider` and is only *active*
when its corresponding ``*_ENABLED`` setting is ``True``. Today only
:class:`InAppProvider` (which persists rows to the ``notifications`` table) is
ever active by default; email and FCM turn on purely via environment config,
so enabling them later requires no code changes.

The dispatch logic lives in :mod:`app.services.notifications.service`; this
module only knows how to *send*.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from app.core.config import settings
from app.db.models.notification import NotificationModel

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class NotificationPayload:
    """A notification to deliver, channel-agnostic."""

    __slots__ = ("data", "event_type", "message", "title", "user_id")

    def __init__(
        self,
        *,
        event_type: str,
        user_id: str,
        title: str,
        message: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        self.event_type = event_type
        self.user_id = user_id
        self.title = title
        self.message = message
        self.data = data


class NotificationProvider(ABC):
    """Base class for a delivery channel."""

    channel: str = ""

    @abstractmethod
    def send(self, db: Session, payload: NotificationPayload) -> None:
        """Deliver ``payload`` over this channel. Failures are logged, never
        raised, so one flaky channel can't break the dispatch loop."""


class InAppProvider(NotificationProvider):
    """Persist the notification to the DB for the in-app inbox."""

    channel = "in_app"

    def send(self, db: Session, payload: NotificationPayload) -> None:
        db.add(
            NotificationModel(
                user_id=payload.user_id,
                channel=self.channel,
                type=payload.event_type,
                title=payload.title,
                message=payload.message,
                data=payload.data,
            )
        )


class EmailProvider(NotificationProvider):
    """Deliver via SMTP. Only active when ``EMAIL_NOTIFICATIONS_ENABLED``."""

    channel = "email"

    def send(self, db: Session, payload: NotificationPayload) -> None:  # noqa: ARG002
        # TODO(future): build an HTML/text email from payload and send via
        # smtplib using settings.EMAIL_* once email delivery is enabled.
        logger.info(
            "Email notification for user %s (%s) skipped: email provider active but not wired yet",
            payload.user_id,
            payload.event_type,
        )


class FcmProvider(NotificationProvider):
    """Deliver via Firebase Cloud Messaging. Only active when ``FCM_NOTIFICATIONS_ENABLED``."""

    channel = "fcm"

    def send(self, db: Session, payload: NotificationPayload) -> None:  # noqa: ARG002
        # TODO(future): initialize firebase-admin from
        # settings.FCM_CREDENTIALS_FILE and send a push once the mobile app
        # exists. Device tokens would be stored per-user.
        logger.info(
            "FCM notification for user %s (%s) skipped: FCM provider active but not wired yet",
            payload.user_id,
            payload.event_type,
        )


def get_active_providers() -> list[NotificationProvider]:
    """Return providers for every channel enabled in config."""
    providers: list[NotificationProvider] = [InAppProvider()]
    if settings.EMAIL_NOTIFICATIONS_ENABLED:
        providers.append(EmailProvider())
    if settings.FCM_NOTIFICATIONS_ENABLED:
        providers.append(FcmProvider())
    return providers
