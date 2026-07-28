from fastapi import Request
from sqladmin.authentication import AuthenticationBackend

from app.services.auth import AuthService


class AdminAuth(AuthenticationBackend):
    """Admin authentication using JWT from cookie or Authorization header."""

    async def authenticate(self, request: Request) -> bool:
        token = request.cookies.get("access_token")
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            return False

        payload = AuthService.decode_token(token)
        return payload is not None
