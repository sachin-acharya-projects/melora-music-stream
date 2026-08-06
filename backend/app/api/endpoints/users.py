from typing import Annotated, Any

from fastapi import APIRouter, Query
from sqlalchemy import or_

from app.api.deps import CurrentUser, SessionDep
from app.db.models.user import UserModel

router = APIRouter()


@router.get("/search")
def search_users(
    db: SessionDep,
    user: CurrentUser,  # noqa: ARG001  (dependency injection only)
    q: Annotated[str, Query(min_length=1, max_length=50)],
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> list[dict[str, Any]]:
    """Search users by username or display name (for playlist invites)."""
    pattern = f"%{q}%"
    users = (
        db.query(UserModel)
        .filter(
            UserModel.is_active == True,  # noqa: E712
            or_(
                UserModel.username.ilike(pattern), UserModel.display_name.ilike(pattern)
            ),
        )
        .order_by(UserModel.username)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
        }
        for u in users
    ]
