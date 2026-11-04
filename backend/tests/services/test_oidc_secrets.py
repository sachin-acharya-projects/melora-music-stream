import pytest
from cryptography.fernet import Fernet

from app.core.config import settings
from app.services.oidc_secrets import (
    OIDCSecretConfigurationError,
    OIDCSecretDecryptionError,
    decrypt_oidc_client_secret,
    encrypt_oidc_client_secret,
)


def test_oidc_client_secret_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", Fernet.generate_key().decode())
    secret = "provider-client-secret"

    ciphertext = encrypt_oidc_client_secret(secret)

    assert ciphertext != secret
    assert decrypt_oidc_client_secret(ciphertext) == secret


def test_encryption_requires_a_dedicated_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", "")

    with pytest.raises(OIDCSecretConfigurationError):
        encrypt_oidc_client_secret("provider-client-secret")


def test_decryption_rejects_invalid_ciphertext(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", Fernet.generate_key().decode())

    with pytest.raises(OIDCSecretDecryptionError):
        decrypt_oidc_client_secret("not-valid-ciphertext")
