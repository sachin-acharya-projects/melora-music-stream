"""Dynamic, provider-neutral OIDC login and account-linking routes."""

from typing import Any
from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.db.models.oidc_provider import OIDCProviderModel
from app.services.auth import AuthService
from app.services.oidc_discovery import load_provider_metadata
from app.schemas.oidc import OIDCLoginHandoffExchange
from app.services.oidc_handoffs import OIDCLoginHandoffService
from app.services.oidc_login import OIDCLoginService
from app.services.oidc_secrets import (
    OIDCSecretConfigurationError,
    decrypt_oidc_client_secret,
)

router = APIRouter()


def _provider(db: Session, provider_id: str) -> OIDCProviderModel:
    provider = (
        db.query(OIDCProviderModel)
        .filter(
            OIDCProviderModel.id == provider_id,
            OIDCProviderModel.enabled.is_(True),
        )
        .first()
    )
    if provider is None:
        raise HTTPException(status_code=404, detail="Identity provider not found")
    return provider


def _client(provider: OIDCProviderModel, metadata: dict) -> Any:
    if not provider.client_secret_encrypted:
        raise HTTPException(status_code=503, detail="Identity provider is not fully configured")
    try:
        secret = decrypt_oidc_client_secret(provider.client_secret_encrypted)
    except (OIDCSecretConfigurationError, RuntimeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="OIDC provider secret encryption is not configured correctly",
        ) from exc

    oauth = OAuth()
    oauth.register(
        name="melora_oidc",
        client_id=provider.client_id,
        client_secret=secret,
        server_metadata_url=(
            provider.discovery_url
            or f"{provider.issuer.rstrip('/')}/.well-known/openid-configuration"
        ),
        client_kwargs={
            "scope": " ".join(provider.scopes),
            "code_challenge_method": "S256",
        },
    )
    client = oauth.create_client("melora_oidc")
    # Use the exact metadata and JWKS that were already validated for this flow.
    client.server_metadata = metadata
    return client


def _frontend_redirect(request: Request, **params: str) -> RedirectResponse:
    origin = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(
        url=f"{origin}/auth/callback?{urlencode(params)}",
        status_code=status.HTTP_302_FOUND,
    )


async def _start_flow(
    request: Request,
    db: Session,
    provider_id: str,
    *,
    link_user_id: str | None,
) -> RedirectResponse:
    provider = _provider(db, provider_id)
    # Validate issuer and every advertised endpoint before handing metadata to
    # the OAuth client. The callback uses Authlib's state, nonce and PKCE checks.
    metadata = await load_provider_metadata(provider)
    client = _client(provider, metadata)
    redirect_uri = (
        f"{settings.BACKEND_URL.rstrip('/')}{settings.API_V1_STR}"
        f"/auth/providers/{provider.id}/callback"
    )
    if link_user_id:
        request.session[f"oidc_link_user:{provider.id}"] = link_user_id
    else:
        request.session.pop(f"oidc_link_user:{provider.id}", None)
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/providers/{provider_id}/login", name="oidc_login")
async def oidc_login(
    provider_id: str,
    request: Request,
    db: SessionDep,
) -> RedirectResponse:
    """Begin OIDC sign-in using authorization code + PKCE."""
    return await _start_flow(request, db, provider_id, link_user_id=None)


@router.post("/providers/{provider_id}/link", name="oidc_link")
async def oidc_link(
    provider_id: str,
    request: Request,
    db: SessionDep,
    current_user: CurrentUser,
) -> dict[str, str]:
    """Return the authorization URL for the authenticated browser to navigate to."""
    response = await _start_flow(
        request,
        db,
        provider_id,
        link_user_id=current_user.id,
    )
    return {"authorization_url": response.headers["location"]}


@router.get("/providers/{provider_id}/callback", name="oidc_callback")
async def oidc_callback(
    provider_id: str,
    request: Request,
    db: SessionDep,
) -> RedirectResponse:
    """Validate the OIDC response and sign in or link the verified subject."""
    provider = _provider(db, provider_id)
    try:
        metadata = await load_provider_metadata(provider)
        client = _client(provider, metadata)
        token = await client.authorize_access_token(request)
        claims = token.get("userinfo")
        if not claims or not isinstance(claims, dict):
            raise ValueError("Validated OIDC user claims are missing")
        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject:
            raise ValueError("OIDC subject claim is missing")
        issuer = claims.get("iss")
        if issuer and issuer != provider.issuer:
            raise ValueError("OIDC issuer claim mismatch")
        email = claims.get("email")
        if email is not None and not isinstance(email, str):
            email = None
        email_verified = claims.get("email_verified") is True
        display_name = claims.get("name")
        if not isinstance(display_name, str):
            display_name = None
    except Exception:
        # Authlib validates state, PKCE, ID-token signature, issuer, audience,
        # expiry and nonce. Do not leak provider responses or token details.
        request.session.pop(f"oidc_link_user:{provider.id}", None)
        return _frontend_redirect(request, error="identity_provider_authentication_failed")

    link_user_id = request.session.pop(f"oidc_link_user:{provider.id}", None)
    try:
        if link_user_id:
            from app.db.models.user import UserModel

            user = db.query(UserModel).filter(UserModel.id == link_user_id).first()
            if user is None or not user.is_active:
                raise HTTPException(status_code=401, detail="Account is no longer available")
            OIDCLoginService.link_identity(
                db,
                provider,
                user,
                subject=subject,
                email=email,
                email_verified=email_verified,
                display_name=display_name,
            )
            return _frontend_redirect(request, identity="linked")
        user = OIDCLoginService.resolve_login_user(
            db,
            provider,
            subject=subject,
            email=email,
            email_verified=email_verified,
            display_name=display_name,
        )
    except HTTPException as exc:
        error = "account_link_required" if exc.status_code == 409 else "identity_sign_in_failed"
        return _frontend_redirect(request, error=error)

    handoff_code = OIDCLoginHandoffService.create(db, user.id)
    origin = settings.FRONTEND_URL.rstrip("/")
    return RedirectResponse(
        url=f"{origin}/auth/callback#{urlencode({'handoff': handoff_code})}",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/oidc/exchange")
def exchange_oidc_handoff(
    data: OIDCLoginHandoffExchange,
    db: SessionDep,
) -> dict[str, str]:
    """Exchange a short-lived, one-time browser handoff for Melora JWTs."""
    return OIDCLoginHandoffService.exchange(db, data.handoff_code)
