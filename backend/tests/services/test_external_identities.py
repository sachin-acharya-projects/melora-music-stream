import pytest
from fastapi import HTTPException

from app.db.models.external_identity import ExternalIdentityModel
from app.db.models.oidc_provider import OIDCProviderModel
from app.db.models.user import UserModel
from app.services.external_identities import ExternalIdentityService


def _identity_fixture(db, user: UserModel) -> ExternalIdentityModel:
    provider = OIDCProviderModel(
        name="test-provider",
        issuer="https://id.example.com",
        client_id="melora",
        display_name="Example ID",
        enabled=True,
    )
    db.add(provider)
    db.flush()
    identity = ExternalIdentityModel(
        user_id=user.id,
        provider_id=provider.id,
        issuer=provider.issuer,
        subject="subject-123",
        email="user@example.com",
        email_verified=True,
        display_name="Test User",
    )
    db.add(identity)
    db.commit()
    db.refresh(identity)
    return identity


def test_unlink_rejects_removing_only_login_method(db, test_user) -> None:
    identity = _identity_fixture(db, test_user)

    with pytest.raises(HTTPException) as exc:
        ExternalIdentityService.unlink(db, test_user, identity.id)

    assert exc.value.status_code == 409


def test_unlink_allows_removal_when_password_is_configured(db, test_user) -> None:
    test_user.password_hash = "existing-password-hash"
    identity = _identity_fixture(db, test_user)

    ExternalIdentityService.unlink(db, test_user, identity.id)

    assert db.query(ExternalIdentityModel).filter_by(id=identity.id).first() is None


def test_identity_listing_does_not_expose_subject(db, test_user) -> None:
    _identity_fixture(db, test_user)

    result = ExternalIdentityService.list_for_user(db, test_user)

    assert len(result) == 1
    assert "subject" not in result[0]
    assert result[0]["provider_name"] == "Example ID"
