from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep
from app.api.deps.auth import require_user_or_scopes
from app.db.models.user import UserModel
from app.core.config import settings
from app.services.users import UserService

router = APIRouter()
ProfileReadUser = Annotated[UserModel, Depends(require_user_or_scopes("profile:read"))]


@router.get("/search")
def search_users(
    db: SessionDep,
    user: ProfileReadUser,  # noqa: ARG001  (dependency injection only)
    q: Annotated[str, Query(min_length=1, max_length=50)],
    limit: Annotated[int, Query(ge=1, le=settings.USER_SEARCH_LIMIT_MAX)] = (
        settings.USER_SEARCH_LIMIT_DEFAULT
    ),
) -> list[dict[str, Any]]:
    """Search users by username or display name (for playlist invites)."""
    return UserService.search(db, query=q, limit=limit)
