import base64
import hashlib
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api.deps.auth import require_scopes
from app.db.models.oauth_tokens import (
    OAuthAuthorizationCodeModel,
    OAuthRefreshTokenModel,
)
from app.schemas.oauth import OAuthAuthorizeRequest, OAuthRevokeRequest, OAuthTokenRequest
from app.services.oauth_applications import OAuthApplicationService
from app.services.oauth_tokens import OAuthTokenService


def _create_app(db, owner):
    return OAuthApplicationService.create(
        db,
        owner,
        name="OAuth Test Client",
        description=None,
        redirect_uris=["https://client.example.com/callback"],
        allowed_scopes=["profile:read", "library:read"],
    )


def _authorize(db, user, app_data, verifier: str = "a" * 43) -> tuple[str, str]:
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    result = OAuthTokenService.authorize(
        db,
        user,
        OAuthAuthorizeRequest(
            client_id=str(app_data["client_id"]),
            redirect_uri="https://client.example.com/callback",
            scopes=["profile:read"],
            state="state-value-that-is-long-enough",
            code_challenge=challenge,
            code_challenge_method="S256",
        ),
    )
    query = parse_qs(urlsplit(result).query)
    return query["code"][0], verifier


def test_pkce_authorization_code_exchange_and_refresh_rotation(db, test_user) -> None:
    app_data = _create_app(db, test_user)
    code, verifier = _authorize(db, test_user, app_data)

    code_record = db.query(OAuthAuthorizationCodeModel).one()
    assert code_record.code_hash != code

    tokens = OAuthTokenService.exchange(
        db,
        OAuthTokenRequest(
            grant_type="authorization_code",
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            redirect_uri="https://client.example.com/callback",
            code=code,
            code_verifier=verifier,
        ),
    )
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["scope"] == "profile:read"

    db.refresh(code_record)
    assert code_record.consumed_at is not None

    first_refresh = str(tokens["refresh_token"])
    rotated = OAuthTokenService.exchange(
        db,
        OAuthTokenRequest(
            grant_type="refresh_token",
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            refresh_token=first_refresh,
        ),
    )
    assert rotated["refresh_token"] != first_refresh
    refresh_records = db.query(OAuthRefreshTokenModel).all()
    assert len(refresh_records) == 2
    assert sum(record.consumed_at is not None for record in refresh_records) == 1


def test_authorization_code_cannot_be_reused(db, test_user) -> None:
    app_data = _create_app(db, test_user)
    code, verifier = _authorize(db, test_user, app_data)
    request = OAuthTokenRequest(
        grant_type="authorization_code",
        client_id=str(app_data["client_id"]),
        client_secret=str(app_data["client_secret"]),
        redirect_uri="https://client.example.com/callback",
        code=code,
        code_verifier=verifier,
    )
    OAuthTokenService.exchange(db, request)

    with pytest.raises(HTTPException) as exc:
        OAuthTokenService.exchange(db, request)

    assert exc.value.status_code == 400


def test_pkce_verifier_must_match_authorization_challenge(db, test_user) -> None:
    app_data = _create_app(db, test_user)
    code, _ = _authorize(db, test_user, app_data)

    with pytest.raises(HTTPException) as exc:
        OAuthTokenService.exchange(
            db,
            OAuthTokenRequest(
                grant_type="authorization_code",
                client_id=str(app_data["client_id"]),
                client_secret=str(app_data["client_secret"]),
                redirect_uri="https://client.example.com/callback",
                code=code,
                code_verifier="b" * 43,
            ),
        )

    assert exc.value.status_code == 400


def test_refresh_token_reuse_revokes_entire_family(db, test_user) -> None:
    app_data = _create_app(db, test_user)
    code, verifier = _authorize(db, test_user, app_data)
    initial = OAuthTokenService.exchange(
        db,
        OAuthTokenRequest(
            grant_type="authorization_code",
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            redirect_uri="https://client.example.com/callback",
            code=code,
            code_verifier=verifier,
        ),
    )
    old_refresh = str(initial["refresh_token"])
    rotated = OAuthTokenService.exchange(
        db,
        OAuthTokenRequest(
            grant_type="refresh_token",
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            refresh_token=old_refresh,
        ),
    )

    with pytest.raises(HTTPException, match="reuse detected"):
        OAuthTokenService.exchange(
            db,
            OAuthTokenRequest(
                grant_type="refresh_token",
                client_id=str(app_data["client_id"]),
                client_secret=str(app_data["client_secret"]),
                refresh_token=old_refresh,
            ),
        )

    new_hash = hashlib.sha256(str(rotated["refresh_token"]).encode()).hexdigest()
    new_record = db.query(OAuthRefreshTokenModel).filter_by(token_hash=new_hash).one()
    db.refresh(new_record)
    assert new_record.revoked_at is not None


def test_confidential_client_secret_is_required(db, test_user) -> None:
    app_data = _create_app(db, test_user)

    with pytest.raises(HTTPException) as exc:
        OAuthTokenService.exchange(
            db,
            OAuthTokenRequest(
                grant_type="authorization_code",
                client_id=str(app_data["client_id"]),
                client_secret="wrong-secret",  # noqa: S106
                code="a" * 43,
                redirect_uri="https://client.example.com/callback",
                code_verifier="a" * 43,
            ),
        )

    assert exc.value.status_code == 401



def test_oauth_refresh_token_revocation_invalidates_family(db, test_user) -> None:
    app_data = _create_app(db, test_user)
    code, verifier = _authorize(db, test_user, app_data)
    tokens = OAuthTokenService.exchange(
        db,
        OAuthTokenRequest(
            grant_type="authorization_code",
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            redirect_uri="https://client.example.com/callback",
            code=code,
            code_verifier=verifier,
        ),
    )
    OAuthTokenService.revoke(
        db,
        OAuthRevokeRequest(
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            token=str(tokens["refresh_token"]),
        ),
    )

    with pytest.raises(HTTPException):
        OAuthTokenService.exchange(
            db,
            OAuthTokenRequest(
                grant_type="refresh_token",
                client_id=str(app_data["client_id"]),
                client_secret=str(app_data["client_secret"]),
                refresh_token=str(tokens["refresh_token"]),
            ),
        )



def test_deactivated_oauth_app_invalidates_existing_access_token(db, test_user) -> None:
    app_data = _create_app(db, test_user)
    code, verifier = _authorize(db, test_user, app_data)
    tokens = OAuthTokenService.exchange(
        db,
        OAuthTokenRequest(
            grant_type="authorization_code",
            client_id=str(app_data["client_id"]),
            client_secret=str(app_data["client_secret"]),
            redirect_uri="https://client.example.com/callback",
            code=code,
            code_verifier=verifier,
        ),
    )
    app = OAuthApplicationService.list_for_owner(db, test_user)[0]
    OAuthApplicationService.deactivate(db, test_user, app.id)

    with pytest.raises(HTTPException) as exc:
        require_scopes("profile:read")(
            credentials=HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials=str(tokens["access_token"]),
            ),
            db=db,
        )

    assert exc.value.status_code == 401
