from fastapi import HTTPException, Request
from sqladmin.authentication import AuthenticationBackend

from app.db.base import SessionLocal
from app.db.models.user import UserRole
from app.services.auth import AuthService


class AdminAuth(AuthenticationBackend):
    """Admin authentication using JWT from cookie or Authorization header.

    A valid access token is not enough: the authenticated user must also have
    the ``admin`` role, otherwise the sqladmin panel is off-limits.
    """

    async def authenticate(self, request: Request) -> bool:
        token = request.cookies.get("access_token")
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            return False

        with SessionLocal() as db:
            try:
                user = AuthService.get_current_user_from_token(token, db=db)
            except HTTPException:
                return False
            return user.is_active and user.role == UserRole.ADMIN.value
