from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import resolve_avatar_url
from app.db.models.user import UserModel
from app.schemas.auth import UserUpdate


class UserService:
    """User lookups and serialization."""

    @staticmethod
    def update_profile(
        db: Session, *, user: UserModel, data: UserUpdate
    ) -> UserModel:
        """Apply a partial profile update and persist it."""
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def search(db: Session, *, query: str, limit: int) -> list[dict[str, Any]]:
        """Search active users by username or display name (for playlist invites)."""
        pattern = f"%{query}%"
        users = (
            db.query(UserModel)
            .filter(
                UserModel.is_active == True,  # noqa: E712
                or_(
                    UserModel.username.ilike(pattern),
                    UserModel.display_name.ilike(pattern),
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
                "avatar_url": resolve_avatar_url(u.avatar_url),
            }
            for u in users
        ]
