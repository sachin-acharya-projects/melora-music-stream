import hashlib

import pytest
from fastapi import HTTPException

from app.db.models.oauth_application import OAuthApplicationModel
from app.services.oauth_applications import OAuthApplicationService


def test_oauth_application_secret_is_hashed_and_shown_once(db, test_user) -> None:
    created = OAuthApplicationService.create(
        db,
        test_user,
        name="Melora Companion",
        description="Personal integration",
        redirect_uris=["https://companion.example.com/oauth/callback"],
        allowed_scopes=["profile:read", "library:read"],
    )
    secret = str(created["client_secret"])
    app = db.query(OAuthApplicationModel).one()

    assert app.client_id == created["client_id"]
    assert app.client_secret_hash == hashlib.sha256(secret.encode()).hexdigest()
    assert app.client_secret_hash != secret
    assert app.allowed_scopes == ["library:read", "profile:read"]

    listed = OAuthApplicationService.list_for_owner(db, test_user)
    assert len(listed) == 1
    assert not hasattr(listed[0], "client_secret")


def test_oauth_app_registration_cannot_exceed_owner_permissions(db, test_user) -> None:
    with pytest.raises(HTTPException) as exc:
        OAuthApplicationService.create(
            db,
            test_user,
            name="Overprivileged",
            description=None,
            redirect_uris=["https://app.example.com/callback"],
            allowed_scopes=["profile:read", "admin:users:write"],
        )

    assert exc.value.status_code == 403


@pytest.mark.parametrize(
    "uri",
    [
        "http://attacker.example/callback",
        "https://app.example.com/callback#fragment",
        "https://user:password@app.example.com/callback",
        "https://*.example.com/callback",
        "javascript:alert(1)",
    ],
)
def test_unsafe_oauth_redirect_uris_are_rejected(uri: str) -> None:
    with pytest.raises(HTTPException):
        OAuthApplicationService.validate_redirect_uri(uri)


def test_loopback_and_reverse_domain_custom_schemes_are_supported() -> None:
    assert (
        OAuthApplicationService.validate_redirect_uri(
            "http://127.0.0.1:8765/callback"
        )
        == "http://127.0.0.1:8765/callback"
    )
    assert (
        OAuthApplicationService.validate_redirect_uri(
            "com.example.melora://oauth/callback"
        )
        == "com.example.melora://oauth/callback"
    )


def test_oauth_app_deactivation_is_owner_scoped(db, test_user, admin_user) -> None:
    OAuthApplicationService.create(
        db,
        test_user,
        name="Owned app",
        description=None,
        redirect_uris=["https://owned.example.com/callback"],
        allowed_scopes=["profile:read"],
    )
    app = db.query(OAuthApplicationModel).one()

    with pytest.raises(HTTPException) as exc:
        OAuthApplicationService.deactivate(db, admin_user, app.id)

    assert exc.value.status_code == 404
    OAuthApplicationService.deactivate(db, test_user, app.id)
    db.refresh(app)
    assert app.is_active is False
