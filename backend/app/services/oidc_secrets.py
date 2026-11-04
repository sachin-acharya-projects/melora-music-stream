"""Encryption helpers for secrets stored in identity-provider configuration."""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class OIDCSecretConfigurationError(RuntimeError):
    """Raised when the dedicated OIDC encryption key is missing or invalid."""


class OIDCSecretDecryptionError(RuntimeError):
    """Raised when stored OIDC ciphertext cannot be decrypted."""


def _fernet() -> Fernet:
    key = settings.OIDC_SECRET_ENCRYPTION_KEY
    if not key:
        raise OIDCSecretConfigurationError(
            "OIDC_SECRET_ENCRYPTION_KEY must be configured before storing provider secrets"
        )
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise OIDCSecretConfigurationError(
            "OIDC_SECRET_ENCRYPTION_KEY must be a valid Fernet key"
        ) from exc


def encrypt_oidc_client_secret(secret: str) -> str:
    """Encrypt a provider client secret for database storage."""
    if not secret:
        raise ValueError("OIDC client secret must not be empty")
    return _fernet().encrypt(secret.encode("utf-8")).decode("ascii")


def decrypt_oidc_client_secret(ciphertext: str) -> str:
    """Decrypt a stored provider client secret without exposing ciphertext errors."""
    try:
        return _fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeEncodeError, UnicodeDecodeError) as exc:
        raise OIDCSecretDecryptionError(
            "Stored OIDC client secret could not be decrypted; verify the encryption key"
        ) from exc
