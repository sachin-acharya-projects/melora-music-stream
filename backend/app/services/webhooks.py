"""Webhook subscription lifecycle, event outbox, and signed delivery worker."""

import asyncio
import hashlib
import hmac
import ipaddress
import json
import secrets
import socket
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.webhook_events import WEBHOOK_EVENT_CATALOG
from app.db.models.user import UserModel
from app.db.models.webhook import WebhookDeliveryModel, WebhookSubscriptionModel
from app.services.webhook_secrets import (
    WebhookSecretConfigurationError,
    decrypt_webhook_secret,
    encrypt_webhook_secret,
)


class WebhookEndpointRejected(ValueError):
    """Raised when a webhook endpoint is not a safe public HTTPS destination."""


class WebhookSubscriptionService:
    @staticmethod
    def validate_endpoint_syntax(endpoint_url: str) -> str:
        """Validate an HTTPS endpoint; public DNS is checked again at delivery time."""
        value = endpoint_url.strip()
        try:
            parts = urlsplit(value)
            _ = parts.port
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid webhook endpoint URL",
            ) from exc
        if (
            not value
            or len(value) > 2048
            or parts.scheme.lower() != "https"
            or not parts.hostname
            or parts.username
            or parts.password
            or parts.fragment
            or "*" in value
            or "\\" in value
            or any(ord(character) < 32 for character in value)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Webhook endpoints must be public HTTPS URLs without credentials or fragments",
            )
        return value

    @staticmethod
    def create(
        db: Session,
        user: UserModel,
        *,
        name: str,
        endpoint_url: str,
        events: list[str],
    ) -> dict[str, object]:
        if not name.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Webhook name cannot be blank",
            )
        endpoint = WebhookSubscriptionService.validate_endpoint_syntax(endpoint_url)
        selected_events = sorted(set(event.strip() for event in events if event.strip()))
        unknown = set(selected_events) - set(WEBHOOK_EVENT_CATALOG)
        if unknown:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown webhook event(s): {', '.join(sorted(unknown))}",
            )
        if not selected_events:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one webhook event must be selected",
            )

        signing_secret = "whsec_" + secrets.token_urlsafe(32)
        try:
            encrypted_secret = encrypt_webhook_secret(signing_secret)
        except WebhookSecretConfigurationError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Webhook secret encryption is not configured on this server",
            ) from exc

        subscription = WebhookSubscriptionModel(
            user_id=user.id,
            name=name.strip(),
            endpoint_url=endpoint,
            secret_encrypted=encrypted_secret,
            events=selected_events,
            is_active=True,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        return {
            "id": subscription.id,
            "name": subscription.name,
            "endpoint_url": subscription.endpoint_url,
            "events": subscription.events,
            "is_active": subscription.is_active,
            "created_at": subscription.created_at,
            "signing_secret": signing_secret,
        }

    @staticmethod
    def list_for_user(
        db: Session, user: UserModel
    ) -> list[WebhookSubscriptionModel]:
        return (
            db.query(WebhookSubscriptionModel)
            .filter(WebhookSubscriptionModel.user_id == user.id)
            .order_by(WebhookSubscriptionModel.created_at.desc())
            .all()
        )

    @staticmethod
    def rotate_secret(
        db: Session,
        user: UserModel,
        subscription_id: str,
    ) -> str:
        subscription = (
            db.query(WebhookSubscriptionModel)
            .filter(
                WebhookSubscriptionModel.id == subscription_id,
                WebhookSubscriptionModel.user_id == user.id,
            )
            .first()
        )
        if subscription is None:
            raise HTTPException(status_code=404, detail="Webhook subscription not found")
        signing_secret = "whsec_" + secrets.token_urlsafe(32)
        try:
            subscription.secret_encrypted = encrypt_webhook_secret(signing_secret)
        except WebhookSecretConfigurationError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Webhook secret encryption is not configured on this server",
            ) from exc
        db.commit()
        return signing_secret

    @staticmethod
    def delete(db: Session, user: UserModel, subscription_id: str) -> None:
        subscription = (
            db.query(WebhookSubscriptionModel)
            .filter(
                WebhookSubscriptionModel.id == subscription_id,
                WebhookSubscriptionModel.user_id == user.id,
            )
            .first()
        )
        if subscription is None:
            raise HTTPException(status_code=404, detail="Webhook subscription not found")
        db.delete(subscription)
        db.commit()


class WebhookEventService:
    @staticmethod
    def enqueue_event(
        db: Session,
        user_id: str,
        event_type: str,
        data: dict[str, object],
    ) -> int:
        """Persist one delivery per matching active subscription for a user."""
        if event_type not in WEBHOOK_EVENT_CATALOG:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported webhook event type",
            )
        subscriptions = (
            db.query(WebhookSubscriptionModel)
            .filter(
                WebhookSubscriptionModel.user_id == user_id,
                WebhookSubscriptionModel.is_active.is_(True),
            )
            .all()
        )
        matching = [
            subscription
            for subscription in subscriptions
            if event_type in subscription.events
        ]
        if not matching:
            return 0

        now = datetime.now(UTC)
        event_id = uuid.uuid4().hex
        payload: dict[str, object] = {
            "id": event_id,
            "type": event_type,
            "created_at": now.isoformat(),
            "user_id": user_id,
            "data": data,
        }
        for subscription in matching:
            db.add(
                WebhookDeliveryModel(
                    subscription_id=subscription.id,
                    event_id=event_id,
                    event_type=event_type,
                    payload=payload,
                    status="pending",
                    attempts=0,
                    next_attempt_at=now,
                )
            )
        db.commit()
        return len(matching)


class WebhookDeliveryService:
    MAX_ATTEMPTS = 10
    BASE_RETRY_SECONDS = 30
    MAX_RETRY_SECONDS = 86400
    CLAIM_TIMEOUT_MINUTES = 5
    REQUEST_TIMEOUT_SECONDS = 10

    @staticmethod
    async def _validate_public_endpoint(endpoint_url: str) -> None:
        """Resolve every address and reject private, loopback, and reserved targets."""
        parts = urlsplit(endpoint_url)
        host = parts.hostname
        if not host:
            raise WebhookEndpointRejected("Webhook endpoint has no hostname")
        port = parts.port or 443
        try:
            results = await asyncio.to_thread(
                socket.getaddrinfo,
                host,
                port,
                type=socket.SOCK_STREAM,
            )
        except OSError as exc:
            raise WebhookEndpointRejected("Webhook hostname could not be resolved") from exc

        addresses = {
            ipaddress.ip_address(result[4][0].split("%", maxsplit=1)[0])
            for result in results
        }
        if not addresses or any(not address.is_global for address in addresses):
            raise WebhookEndpointRejected(
                "Webhook endpoint must resolve exclusively to public IP addresses"
            )

    @staticmethod
    async def deliver_pending(
        db: Session,
        *,
        limit: int = 25,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> dict[str, int]:
        """Claim due outbox rows, send signed requests, and schedule bounded retries."""
        now = datetime.now(UTC)
        stale_before = now - timedelta(
            minutes=WebhookDeliveryService.CLAIM_TIMEOUT_MINUTES
        )
        deliveries = (
            db.query(WebhookDeliveryModel)
            .filter(
                or_(
                    and_(
                        WebhookDeliveryModel.status == "pending",
                        WebhookDeliveryModel.next_attempt_at <= now,
                    ),
                    and_(
                        WebhookDeliveryModel.status == "processing",
                        WebhookDeliveryModel.claimed_at <= stale_before,
                    ),
                )
            )
            .order_by(WebhookDeliveryModel.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(limit)
            .all()
        )
        for delivery in deliveries:
            delivery.status = "processing"
            delivery.claimed_at = now
            delivery.attempts += 1
        db.commit()

        delivered = 0
        retried = 0
        failed = 0
        async with httpx.AsyncClient(
            timeout=WebhookDeliveryService.REQUEST_TIMEOUT_SECONDS,
            follow_redirects=False,
            transport=transport,
        ) as client:
            for delivery in deliveries:
                subscription = (
                    db.query(WebhookSubscriptionModel)
                    .filter(
                        WebhookSubscriptionModel.id == delivery.subscription_id,
                        WebhookSubscriptionModel.is_active.is_(True),
                    )
                    .first()
                )
                if subscription is None:
                    delivery.status = "failed"
                    delivery.last_error = "Subscription is inactive or unavailable"
                    delivery.claimed_at = None
                    failed += 1
                    db.commit()
                    continue

                try:
                    await WebhookDeliveryService._validate_public_endpoint(
                        subscription.endpoint_url
                    )
                    signing_secret = decrypt_webhook_secret(
                        subscription.secret_encrypted
                    )
                    body = json.dumps(
                        delivery.payload,
                        sort_keys=True,
                        separators=(",", ":"),
                        ensure_ascii=False,
                    ).encode("utf-8")
                    timestamp = str(int(now.timestamp()))
                    signed_content = timestamp.encode("ascii") + b"." + body
                    signature = hmac.new(
                        signing_secret.encode("utf-8"),
                        signed_content,
                        hashlib.sha256,
                    ).hexdigest()
                    response = await client.post(
                        subscription.endpoint_url,
                        content=body,
                        headers={
                            "Content-Type": "application/json",
                            "X-Melora-Event": delivery.event_type,
                            "X-Melora-Event-ID": delivery.event_id,
                            "X-Melora-Timestamp": timestamp,
                            "X-Melora-Signature": f"sha256={signature}",
                        },
                    )
                    if not 200 <= response.status_code < 300:
                        raise RuntimeError(
                            f"Webhook endpoint returned HTTP {response.status_code}"
                        )
                    delivery.status = "delivered"
                    delivery.delivered_at = datetime.now(UTC)
                    delivery.last_error = None
                    delivered += 1
                except WebhookEndpointRejected as exc:
                    delivery.status = "failed"
                    delivery.last_error = str(exc)[:1000]
                    failed += 1
                except Exception as exc:  # noqa: BLE001
                    delivery.last_error = type(exc).__name__
                    if delivery.attempts >= WebhookDeliveryService.MAX_ATTEMPTS:
                        delivery.status = "failed"
                        failed += 1
                    else:
                        delay = min(
                            WebhookDeliveryService.BASE_RETRY_SECONDS
                            * (2 ** (delivery.attempts - 1)),
                            WebhookDeliveryService.MAX_RETRY_SECONDS,
                        )
                        delivery.status = "pending"
                        delivery.next_attempt_at = datetime.now(UTC) + timedelta(
                            seconds=delay
                        )
                        retried += 1
                delivery.claimed_at = None
                db.commit()

        return {"delivered": delivered, "retried": retried, "failed": failed}
