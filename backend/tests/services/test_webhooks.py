import asyncio
import hashlib
import hmac
import json
from datetime import UTC, datetime

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException

from app.core.config import settings
from app.db.models.webhook import WebhookDeliveryModel, WebhookSubscriptionModel
from app.services.webhook_secrets import decrypt_webhook_secret
from app.services.webhooks import (
    WebhookDeliveryService,
    WebhookEventService,
    WebhookSubscriptionService,
)


def _configure_webhook_key(monkeypatch) -> None:
    monkeypatch.setattr(
        settings,
        "WEBHOOK_SECRET_ENCRYPTION_KEY",
        Fernet.generate_key().decode("ascii"),
    )


def test_subscription_secret_is_encrypted_and_returned_once(
    db, test_user, monkeypatch
) -> None:
    _configure_webhook_key(monkeypatch)
    created = WebhookSubscriptionService.create(
        db,
        test_user,
        name="Playlist updates",
        endpoint_url="https://hooks.example.com/melora",
        events=["playlist.created"],
    )
    record = db.query(WebhookSubscriptionModel).one()

    assert record.secret_encrypted != created["signing_secret"]
    assert decrypt_webhook_secret(record.secret_encrypted) == created["signing_secret"]
    assert record.events == ["playlist.created"]
    listed = WebhookSubscriptionService.list_for_user(db, test_user)
    assert len(listed) == 1
    assert not hasattr(listed[0], "signing_secret")


def test_subscription_rejects_non_https_or_ambiguous_urls() -> None:
    for endpoint in [
        "http://hooks.example.com/callback",
        "https://user:pass@hooks.example.com/callback",
        "https://hooks.example.com/callback#fragment",
        "https://*.example.com/callback",
    ]:
        with pytest.raises(HTTPException):
            WebhookSubscriptionService.validate_endpoint_syntax(endpoint)


def test_subscription_rejects_unknown_events(db, test_user, monkeypatch) -> None:
    _configure_webhook_key(monkeypatch)
    with pytest.raises(HTTPException) as exc:
        WebhookSubscriptionService.create(
            db,
            test_user,
            name="Unknown event",
            endpoint_url="https://hooks.example.com/callback",
            events=["system.root_access"],
        )
    assert exc.value.status_code == 422


def test_event_enqueue_creates_outbox_rows_for_matching_subscriptions(
    db, test_user, monkeypatch
) -> None:
    _configure_webhook_key(monkeypatch)
    WebhookSubscriptionService.create(
        db,
        test_user,
        name="Playlist only",
        endpoint_url="https://hooks.example.com/playlist",
        events=["playlist.created"],
    )
    WebhookSubscriptionService.create(
        db,
        test_user,
        name="Playback only",
        endpoint_url="https://hooks.example.com/playback",
        events=["playback.started"],
    )

    count = WebhookEventService.enqueue_event(
        db,
        test_user.id,
        "playlist.created",
        {"playlist_id": "playlist-123"},
    )

    assert count == 1
    delivery = db.query(WebhookDeliveryModel).one()
    assert delivery.status == "pending"
    assert delivery.payload["data"]["playlist_id"] == "playlist-123"


def test_delivery_sends_timestamped_hmac_signature(
    db, test_user, monkeypatch
) -> None:
    _configure_webhook_key(monkeypatch)
    created = WebhookSubscriptionService.create(
        db,
        test_user,
        name="Signed delivery",
        endpoint_url="https://hooks.example.com/callback",
        events=["playlist.created"],
    )
    WebhookEventService.enqueue_event(
        db,
        test_user.id,
        "playlist.created",
        {"playlist_id": "playlist-456"},
    )
    monkeypatch.setattr(
        WebhookDeliveryService,
        "_validate_public_endpoint",
        staticmethod(lambda endpoint: asyncio.sleep(0)),
    )
    captured: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["headers"] = request.headers
        captured["body"] = request.content
        return httpx.Response(204)

    transport = httpx.MockTransport(handler)
    result = asyncio.run(
        WebhookDeliveryService.deliver_pending(db, transport=transport)
    )

    assert result == {"delivered": 1, "retried": 0, "failed": 0}
    headers = captured["headers"]
    body = captured["body"]
    assert isinstance(body, bytes)
    timestamp = headers["X-Melora-Timestamp"]
    expected = hmac.new(
        str(created["signing_secret"]).encode("utf-8"),
        timestamp.encode("ascii") + b"." + body,
        hashlib.sha256,
    ).hexdigest()
    assert headers["X-Melora-Signature"] == f"sha256={expected}"
    assert json.loads(body)["type"] == "playlist.created"
    delivery = db.query(WebhookDeliveryModel).one()
    assert delivery.status == "delivered"
    assert delivery.delivered_at is not None


def test_failed_delivery_is_scheduled_for_retry(db, test_user, monkeypatch) -> None:
    _configure_webhook_key(monkeypatch)
    WebhookSubscriptionService.create(
        db,
        test_user,
        name="Retry delivery",
        endpoint_url="https://hooks.example.com/callback",
        events=["playlist.created"],
    )
    WebhookEventService.enqueue_event(
        db,
        test_user.id,
        "playlist.created",
        {"playlist_id": "playlist-789"},
    )
    monkeypatch.setattr(
        WebhookDeliveryService,
        "_validate_public_endpoint",
        staticmethod(lambda endpoint: asyncio.sleep(0)),
    )

    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    result = asyncio.run(
        WebhookDeliveryService.deliver_pending(
            db,
            transport=httpx.MockTransport(handler),
        )
    )

    assert result == {"delivered": 0, "retried": 1, "failed": 0}
    delivery = db.query(WebhookDeliveryModel).one()
    assert delivery.status == "pending"
    assert delivery.attempts == 1
    next_attempt = delivery.next_attempt_at
    if next_attempt.tzinfo is None:
        next_attempt = next_attempt.replace(tzinfo=UTC)
    assert next_attempt > datetime.now(UTC)


def test_webhook_secret_rotation_changes_secret(db, test_user, monkeypatch) -> None:
    _configure_webhook_key(monkeypatch)
    created = WebhookSubscriptionService.create(
        db,
        test_user,
        name="Rotate me",
        endpoint_url="https://hooks.example.com/callback",
        events=["playlist.created"],
    )
    record = db.query(WebhookSubscriptionModel).one()
    previous_secret = str(created["signing_secret"])

    new_secret = WebhookSubscriptionService.rotate_secret(
        db, test_user, record.id
    )

    db.refresh(record)
    assert new_secret != previous_secret
    assert decrypt_webhook_secret(record.secret_encrypted) == new_secret


def test_webhook_delete_is_owner_scoped(db, test_user, admin_user, monkeypatch) -> None:
    _configure_webhook_key(monkeypatch)
    WebhookSubscriptionService.create(
        db,
        test_user,
        name="Private webhook",
        endpoint_url="https://hooks.example.com/callback",
        events=["playlist.created"],
    )
    record = db.query(WebhookSubscriptionModel).one()

    with pytest.raises(HTTPException) as exc:
        WebhookSubscriptionService.delete(db, admin_user, record.id)
    assert exc.value.status_code == 404

    WebhookSubscriptionService.delete(db, test_user, record.id)
    assert db.query(WebhookSubscriptionModel).filter_by(id=record.id).first() is None
