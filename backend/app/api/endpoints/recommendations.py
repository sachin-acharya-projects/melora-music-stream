from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.services.recommendations import (
    RECOMMENDATIONS_DEFAULT_LIMIT,
    RECOMMENDATIONS_MAX_LIMIT,
    RecommendationsService,
)

router = APIRouter()


@router.get("/")
def get_recommendations(
    db: SessionDep,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=RECOMMENDATIONS_MAX_LIMIT)] = (
        RECOMMENDATIONS_DEFAULT_LIMIT
    ),
) -> list[dict[str, Any]]:
    """Suggest songs based on listening history and followed artists."""
    return RecommendationsService.get_for_user(
        db, user_id=current_user.id, limit=limit
    )
