from fastapi import APIRouter

from app.api.deps.auth import CurrentUser
from app.db.base import SessionDep
from app.schemas.oauth import (
    OAuthAuthorizeRequest,
    OAuthRevokeRequest,
    OAuthTokenRequest,
    OAuthTokenResponse,
)
from app.services.oauth_tokens import OAuthTokenService

router = APIRouter()


@router.post("/authorize")
def authorize_oauth_application(
    data: OAuthAuthorizeRequest,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, str]:
    """Authorize an OAuth client for the signed-in user and return its redirect."""
    redirect_url = OAuthTokenService.authorize(db, user, data)
    return {"redirect_url": redirect_url}


@router.post("/token", response_model=OAuthTokenResponse)
def exchange_oauth_token(
    data: OAuthTokenRequest,
    db: SessionDep,
) -> dict[str, str | int | None]:
    """Exchange a PKCE authorization code or rotate a refresh token."""
    return OAuthTokenService.exchange(db, data)


@router.post("/revoke", status_code=200)
def revoke_oauth_token(
    data: OAuthRevokeRequest,
    db: SessionDep,
) -> dict[str, bool]:
    """Revoke an OAuth refresh token and its rotation family."""
    OAuthTokenService.revoke(db, data)
    return {"revoked": True}
