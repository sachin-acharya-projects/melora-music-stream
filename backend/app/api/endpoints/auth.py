from urllib.parse import urlencode

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.schemas.auth import TokenResponse, UserResponse
from app.services.auth import AuthService

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
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)  # type: ignore[no-any-return]


@router.get("/google/callback")
async def google_callback(request: Request, db: SessionDep) -> RedirectResponse:
    """Handle Google OAuth callback."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        AuthService.handle_oauth_error(e)

    user_info = AuthService.validate_google_oauth_info(token.get("userinfo"))
    local_avatar = AuthService.save_avatar(
        user_info["google_id"], user_info["avatar_url"]
    )
    user = AuthService.upsert_google_user(
        db,
        google_id=user_info["google_id"],
        email=user_info["email"],
        name=user_info["name"],
        avatar_url=local_avatar or user_info["avatar_url"],
    )
    tokens = AuthService.create_tokens_for_user(user)
    params = {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    }
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?{urlencode(params)}"
    return RedirectResponse(url=redirect_url)


@router.get("/me")
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


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
