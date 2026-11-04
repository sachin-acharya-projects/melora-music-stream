from typing import Annotated, Any

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep
from app.api.deps.auth import require_user_or_scopes
from app.db.models.user import UserModel
from app.core.config import settings
from app.services.releases import release_service

router = APIRouter()
ReleaseReadUser = Annotated[UserModel, Depends(require_user_or_scopes("artists:read"))]


@router.get("/")
def get_releases(
    db: SessionDep,
    current_user: ReleaseReadUser,
    limit: Annotated[int, Query(ge=1, le=settings.RELEASES_PAGE_SIZE_MAX)] = (
        settings.RELEASES_PAGE_SIZE_DEFAULT
    ),
    offset: Annotated[int, Query(ge=0)] = 0,
    artist_id: Annotated[str | None, Query(max_length=100)] = None,
) -> dict[str, Any]:
    """New releases from artists the user follows, newest first."""
    return release_service.get_followed_releases(
        db,
        user=current_user,
        limit=limit,
        offset=offset,
        artist_id=artist_id,
    )
