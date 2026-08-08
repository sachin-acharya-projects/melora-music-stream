from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.user import UserModel, UserRole
from app.services.auth import AuthService

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> UserModel:
    """Get current user from JWT token, fetched from DB."""
    token = credentials.credentials if credentials else None
    return AuthService.get_current_user_from_token(token, db=db)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> UserModel | None:
    """Get current user from JWT token. Returns None if not authenticated."""
    token = credentials.credentials if credentials else None
    return AuthService.get_current_user_from_token_optional(token, db=db)


CurrentUser = Annotated[UserModel, Depends(get_current_user)]
OptionalUser = Annotated[UserModel | None, Depends(get_current_user_optional)]


def require_role(*roles: UserRole) -> Callable[..., UserModel]:
    """Dependency factory that requires the user to have one of the specified roles."""

    def role_checker(user: UserModel = Depends(get_current_user)) -> UserModel:
        AuthService.require_role(user, *roles)
        return user

    return role_checker


require_admin = require_role(UserRole.ADMIN)
require_user = require_role(UserRole.ADMIN, UserRole.USER)
