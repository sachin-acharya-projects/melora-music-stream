from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.services.users import UserService

router = APIRouter()


@router.get("/search")
def search_users(
    db: SessionDep,
    user: CurrentUser,  # noqa: ARG001  (dependency injection only)
    q: Annotated[str, Query(min_length=1, max_length=50)],
    limit: Annotated[int, Query(ge=1, le=settings.USER_SEARCH_LIMIT_MAX)] = (
        settings.USER_SEARCH_LIMIT_DEFAULT
    ),
) -> list[dict[str, Any]]:
    """Search users by username or display name (for playlist invites)."""
    return UserService.search(db, query=q, limit=limit)
