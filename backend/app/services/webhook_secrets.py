"""Dedicated Fernet encryption for webhook signing secrets."""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class WebhookSecretConfigurationError(RuntimeError):
    """Raised when the webhook encryption key is missing or invalid."""


class WebhookSecretDecryptionError(RuntimeError):
    """Raised when a stored webhook secret cannot be decrypted."""


def _fernet() -> Fernet:
    key = settings.WEBHOOK_SECRET_ENCRYPTION_KEY
    if not key:
        raise WebhookSecretConfigurationError(
            "WEBHOOK_SECRET_ENCRYPTION_KEY must be configured before creating webhooks"
        )
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise WebhookSecretConfigurationError(
            "WEBHOOK_SECRET_ENCRYPTION_KEY must be a valid Fernet key"
        ) from exc


def encrypt_webhook_secret(secret: str) -> str:
    if not secret:
        raise ValueError("Webhook secret must not be empty")
    return _fernet().encrypt(secret.encode("utf-8")).decode("ascii")


def decrypt_webhook_secret(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeEncodeError, UnicodeDecodeError) as exc:
        raise WebhookSecretDecryptionError(
            "Stored webhook secret could not be decrypted; verify the encryption key"
        ) from exc
