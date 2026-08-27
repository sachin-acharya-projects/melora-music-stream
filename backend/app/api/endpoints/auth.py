import time
from urllib.parse import urlencode

from authlib.integrations.base_client.errors import MismatchingStateError
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.messages import Messages
from app.schemas.auth import TokenResponse, UserResponse, UserUpdate
from app.services.auth import AuthService
from app.services.users import UserService

router = APIRouter()

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/login")
async def login(request: Request) -> RedirectResponse:
    """Initiate Google OAuth login flow."""
    AuthService.require_oauth_configured()
    # Allow the mobile app to request the callback redirect back into the app
    # via a deep link (custom scheme) instead of the web origin. Only our app
    # scheme is honored to avoid an open redirect.
    redirect = request.query_params.get("redirect")
    if redirect and str(redirect).startswith("com.melora.app://"):
        request.session["oauth_redirect"] = str(redirect)
    pending_url = _pending_oauth_url(request)
    if pending_url:
        return RedirectResponse(url=pending_url)
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)  # type: ignore[no-any-return]


def _pending_oauth_url(request: Request) -> str | None:
    """Return a still-valid in-flight Google authorization URL, if any.

    authlib wipes every previously stored OAuth state on each call to
    ``authorize_redirect``, so a second hit to /login (double-click, refresh,
    another tab) invalidates the state of the in-flight attempt and the
    callback then dies with a "mismatching_state" error. Reusing the pending
    URL (same state + nonce) makes repeated clicks harmless.
    """
    now = time.time()
    for key, value in request.session.items():
        if not key.startswith("_state_google_"):
            continue
        if not isinstance(value, dict):
            continue
        exp = value.get("exp")
        if not isinstance(exp, (int, float)) or exp < now:
            continue
        data = value.get("data")
        if isinstance(data, dict) and data.get("url"):
            return data["url"]
    return None


@router.get("/google/callback")
async def google_callback(request: Request, db: SessionDep) -> RedirectResponse:
    """Handle Google OAuth callback."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except MismatchingStateError:
        diag = (
            f"cookie_present={bool(request.cookies.get('session'))}; "
            f"state_keys={[k for k in request.session.keys() if k.startswith('_state_')]}; "
            f"query_state={request.query_params.get('state')}"
        )
        raise HTTPException(status_code=400, detail=f"OAuth login expired. {diag}") from None
    except Exception as e:
        AuthService.handle_oauth_error(e)

    user_info = AuthService.validate_google_oauth_info(token.get("userinfo"))
    local_avatar = AuthService.save_avatar(
        user_info["google_id"], user_info["avatar_url"]
    )
    # Redirect target: prefer a deep link the mobile app requested (so the
    # system browser can hand control back to the app); otherwise return to the
    # same origin that initiated the flow (web or the Capacitor WebView). Either
    # way we never depend on a separately configured FRONTEND_URL.
    custom_redirect = request.session.get("oauth_redirect")

    def build_redirect(query: str) -> str:
        if custom_redirect and str(custom_redirect).startswith("com.melora.app://"):
            return f"{custom_redirect}?{query}"
        origin = f"{request.url.scheme}://{request.url.netloc}"
        return f"{origin}/auth/callback?{query}"

    try:
        user = AuthService.upsert_google_user(
            db,
            google_id=user_info["google_id"],
            email=user_info["email"],
            name=user_info["name"],
            avatar_url=local_avatar or user_info["avatar_url"],
        )
    except HTTPException as exc:
        if exc.detail == Messages.ACCOUNT_DEACTIVATED:
            return RedirectResponse(
                url=build_redirect(urlencode({"error": "account_deactivated"}))
            )
        raise
    tokens = AuthService.create_tokens_for_user(user)
    params = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    }
    return RedirectResponse(url=build_redirect(urlencode(params)))


@router.get("/me")
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Get current user profile."""
    response = UserResponse.model_validate(current_user)
    response.is_super_admin = AuthService.is_super_admin(current_user)
    return response


@router.patch("/me")
def update_me(
    data: UserUpdate, db: SessionDep, current_user: CurrentUser
) -> UserResponse:
    """Update the current user's profile (display name, bio, favorite genres...)."""
    updated = UserService.update_profile(db, user=current_user, data=data)
    response = UserResponse.model_validate(updated)
    response.is_super_admin = AuthService.is_super_admin(updated)
    return response


@router.post("/refresh")
async def refresh_token_endpoint(request: Request, db: SessionDep) -> TokenResponse:
    """Refresh access token using refresh token."""
    body = await request.json()
    payload = AuthService.validate_refresh_token(body.get("refresh_token"))
    user = AuthService.get_user_by_id(db, user_id=payload["sub"])
    tokens = AuthService.create_tokens_for_user(user)
    return TokenResponse(**tokens)


@router.post("/logout")
async def logout() -> dict[str, str]:
    """Logout (client should clear tokens)."""
    return {"message": "Logged out successfully"}
