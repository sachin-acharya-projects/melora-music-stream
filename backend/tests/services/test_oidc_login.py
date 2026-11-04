import pytest
from fastapi import HTTPException

from app.db.models.external_identity import ExternalIdentityModel
from app.db.models.oidc_provider import OIDCProviderModel
from app.db.models.user import UserModel
from app.services.oidc_login import OIDCLoginService


def _provider(db) -> OIDCProviderModel:
    provider = OIDCProviderModel(
        name="oidc-test",
        issuer="https://identity.example.com",
        client_id="melora",
        display_name="Example Identity",
        enabled=True,
        auto_provision=True,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def test_verified_subject_can_provision_a_melora_account(db) -> None:
    provider = _provider(db)

    user = OIDCLoginService.resolve_login_user(
        db,
        provider,
        subject="external-subject-1",
        email="listener@example.com",
        email_verified=True,
        display_name="New Listener",
    )

    identity = (
        db.query(ExternalIdentityModel)
        .filter_by(issuer=provider.issuer, subject="external-subject-1")
        .one()
    )
    assert user.email == "listener@example.com"
    assert identity.user_id == user.id


def test_unverified_email_cannot_provision_account(db) -> None:
    provider = _provider(db)

    with pytest.raises(HTTPException) as exc:
        OIDCLoginService.resolve_login_user(
            db,
            provider,
            subject="external-subject-2",
            email="listener@example.com",
            email_verified=False,
            display_name="New Listener",
        )

    assert exc.value.status_code == 403
    assert db.query(UserModel).filter_by(email="listener@example.com").first() is None


def test_matching_email_never_implicitly_links_identity(db, test_user) -> None:
    provider = _provider(db)

    with pytest.raises(HTTPException) as exc:
        OIDCLoginService.resolve_login_user(
            db,
            provider,
            subject="external-subject-3",
            email=test_user.email,
            email_verified=True,
            display_name="Existing User",
        )

    assert exc.value.status_code == 409
    assert (
        db.query(ExternalIdentityModel)
        .filter_by(issuer=provider.issuer, subject="external-subject-3")
        .first()
        is None
    )


def test_explicit_link_binds_identity_to_authenticated_user(db, test_user) -> None:
    provider = _provider(db)

    OIDCLoginService.link_identity(
        db,
        provider,
        test_user,
        subject="external-subject-4",
        email="different@example.com",
        email_verified=True,
        display_name="Existing User",
    )

    identity = (
        db.query(ExternalIdentityModel)
        .filter_by(issuer=provider.issuer, subject="external-subject-4")
        .one()
    )
    assert identity.user_id == test_user.id
