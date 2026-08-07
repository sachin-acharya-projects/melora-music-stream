from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.schemas.history import HistoryRecordCreate, HistoryUpdate
from app.services.history import HistoryService

router = APIRouter()


@router.post("/")
def record_listen(
    data: HistoryRecordCreate, db: SessionDep, current_user: CurrentUser
) -> dict[str, Any]:
    return HistoryService.record_listen(db, user_id=current_user.id, data=data)


@router.get("/")
def get_history(
    db: SessionDep,
    current_user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
) -> dict[str, Any]:
    return HistoryService.get_history(
        db, user_id=current_user.id, page=page, page_size=page_size
    )


@router.patch("/{entry_id}")
def update_history_entry(
    entry_id: str, data: HistoryUpdate, db: SessionDep, current_user: CurrentUser
) -> dict[str, Any]:
    return HistoryService.update_play_duration(
        db,
        entry_id=entry_id,
        user_id=current_user.id,
        play_duration=data.play_duration,
    )


@router.get("/recent")
def get_recent_history(
    db: SessionDep,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
) -> list[dict[str, Any]]:
    return HistoryService.get_recent(db, user_id=current_user.id, limit=limit)


@router.get("/stats")
def get_history_stats(db: SessionDep, current_user: CurrentUser) -> dict[str, Any]:
    return HistoryService.get_stats(db, user_id=current_user.id)
