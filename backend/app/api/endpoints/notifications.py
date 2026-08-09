from typing import Annotated, Any

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.db.models.notification import NotificationModel
from app.services.notifications import notification_service

router = APIRouter()


@router.get("/")
def list_notifications(
    db: SessionDep,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    """Return the user's in-app notifications, newest first."""
    notifications = notification_service.list_for_user(
        db, user_id=current_user.id, limit=limit, offset=offset
    )
    total = (
        db.query(NotificationModel)
        .filter(NotificationModel.user_id == current_user.id)
        .count()
    )
    return {
        "total": total,
        "unread_count": notification_service.unread_count(db, user_id=current_user.id),
        "items": [
            {
                "id": n.id,
                "channel": n.channel,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "data": n.data,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
    }


@router.get("/unread-count")
def get_unread_count(db: SessionDep, current_user: CurrentUser) -> dict[str, int]:
    """Return how many in-app notifications are unread."""
    return {
        "unread_count": notification_service.unread_count(
            db, user_id=current_user.id
        )
    }


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    notification = notification_service.mark_read(
        db, user_id=current_user.id, notification_id=notification_id
    )
    if notification is None:
        return {"ok": False}
    return {"ok": True}


@router.post("/read-all")
def mark_all_notifications_read(
    db: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    count = notification_service.mark_all_read(db, user_id=current_user.id)
    return {"updated": count}


@router.get("/settings")
def get_notification_settings(
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Return the user's per-event notification channel toggles."""
    return notification_service.get_settings(current_user)


@router.patch("/settings")
def update_notification_settings(
    payload: dict[str, Any],
    db: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Partially update the user's per-event notification channel toggles."""
    return notification_service.update_settings(
        db, user=current_user, settings=payload
    )
