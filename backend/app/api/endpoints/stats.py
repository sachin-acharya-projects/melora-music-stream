from typing import Annotated, Any

from fastapi import APIRouter, Query

from fastapi import Depends

from app.api.deps import SessionDep
from app.api.deps.auth import require_user_or_scopes
from app.db.models.user import UserModel
from app.services.stats import StatsService

router = APIRouter()
StatsReadUser = Annotated[UserModel, Depends(require_user_or_scopes("history:read"))]


@router.get("/")
def get_stats(db: SessionDep, current_user: StatsReadUser) -> dict[str, Any]:
    return StatsService.get_stats(db, user_id=current_user.id)


@router.get("/top-artists")
def get_top_artists(
    db: SessionDep,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[dict[str, Any]]:
    return StatsService.get_top_artists(db, user_id=current_user.id, limit=limit)


@router.get("/top-songs")
def get_top_songs(
    db: SessionDep,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[dict[str, Any]]:
    return StatsService.get_top_songs(db, user_id=current_user.id, limit=limit)


@router.get("/genres")
def get_genres(
    db: SessionDep,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[dict[str, Any]]:
    return StatsService.get_genres(db, user_id=current_user.id, limit=limit)


@router.post("/recalculate")
def recalculate_stats(db: SessionDep, current_user: CurrentUser) -> dict[str, Any]:
    return StatsService.recalculate(db, user_id=current_user.id)
