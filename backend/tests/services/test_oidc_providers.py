from cryptography.fernet import Fernet
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.db.models.external_identity import ExternalIdentityModel
from app.db.models.oidc_provider import OIDCProviderModel
from app.schemas.oidc import OIDCProviderCreate, OIDCProviderUpdate
from app.services.oidc_providers import OIDCProviderService
from app.services.oidc_secrets import decrypt_oidc_client_secret


def test_create_provider_encrypts_secret_and_never_returns_it(
    db, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", Fernet.generate_key().decode())
    secret = "super-secret-value"
    data = OIDCProviderCreate(
        name="company-sso",
        issuer="https://identity.example.com",
        client_id="melora-client",
        client_secret=secret,
        display_name="Company SSO",
        enabled=True,
    )

    response = OIDCProviderService.create(db, data)

    assert "client_secret" not in response
    assert secret not in str(response)
    provider = db.query(OIDCProviderModel).one()
    assert provider.client_secret_encrypted != secret
    assert decrypt_oidc_client_secret(provider.client_secret_encrypted) == secret
    assert response["has_client_secret"] is True


def test_update_without_secret_keeps_existing_secret(
    db, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", Fernet.generate_key().decode())
    created = OIDCProviderService.create(
        db,
        OIDCProviderCreate(
            name="provider",
            issuer="https://identity.example.org",
            client_id="client",
            client_secret="original-secret",
            display_name="Provider",
        ),
    )

    updated = OIDCProviderService.update(
        db, created["id"], OIDCProviderUpdate(display_name="Updated Provider")
    )

    assert updated["display_name"] == "Updated Provider"
    assert "client_secret" not in updated
    assert updated["has_client_secret"] is True


def test_enabled_provider_requires_secret(db) -> None:
    data = OIDCProviderCreate(
        name="no-secret",
        issuer="https://identity.example.net",
        client_id="client",
        display_name="No Secret",
        enabled=True,
    )

    with pytest.raises(HTTPException) as exc:
        OIDCProviderService.create(db, data)

    assert exc.value.status_code == 422



def test_provider_cannot_be_disabled_when_it_is_the_only_login_method(db, test_user) -> None:
    provider = OIDCProviderModel(
        name="only-login",
        issuer="https://only-login.example.com",
        client_id="client",
        client_secret_encrypted="encrypted",
        display_name="Only Login",
        enabled=True,
    )
    db.add(provider)
    db.flush()
    db.add(
        ExternalIdentityModel(
            user_id=test_user.id,
            provider_id=provider.id,
            issuer=provider.issuer,
            subject="only-subject",
        )
    )
    db.commit()

    with pytest.raises(HTTPException) as exc:
        OIDCProviderService.update(db, provider.id, OIDCProviderUpdate(enabled=False))

    assert exc.value.status_code == 409
    db.refresh(provider)
    assert provider.enabled is True


def test_provider_cannot_be_deleted_while_identities_are_linked(db, test_user) -> None:
    provider = OIDCProviderModel(
        name="linked-provider",
        issuer="https://linked.example.com",
        client_id="client",
        display_name="Linked Provider",
        enabled=False,
    )
    db.add(provider)
    db.flush()
    db.add(
        ExternalIdentityModel(
            user_id=test_user.id,
            provider_id=provider.id,
            issuer=provider.issuer,
            subject="linked-subject",
        )
    )
    db.commit()

    with pytest.raises(HTTPException) as exc:
        OIDCProviderService.delete(db, provider.id)

    assert exc.value.status_code == 409
    assert db.query(OIDCProviderModel).filter_by(id=provider.id).first() is not None
