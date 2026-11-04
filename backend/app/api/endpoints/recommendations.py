from typing import Annotated, Any

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep
from app.api.deps.auth import require_user_or_scopes
from app.db.models.user import UserModel
from app.services.recommendations import (
    RECOMMENDATIONS_DEFAULT_LIMIT,
    RECOMMENDATIONS_MAX_LIMIT,
    RecommendationsService,
)

router = APIRouter()
RecommendationReadUser = Annotated[UserModel, Depends(require_user_or_scopes("library:read"))]


@router.get("/")
def get_recommendations(
    db: SessionDep,
    current_user: RecommendationReadUser,
    limit: Annotated[int, Query(ge=1, le=RECOMMENDATIONS_MAX_LIMIT)] = (
        RECOMMENDATIONS_DEFAULT_LIMIT
    ),
) -> list[dict[str, Any]]:
    """Suggest songs based on listening history and followed artists."""
    return RecommendationsService.get_for_user(
        db, user_id=current_user.id, limit=limit
    )
