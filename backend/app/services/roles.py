from __future__ import annotations

from logging import getLogger
from typing import TYPE_CHECKING

from sqlalchemy import func

from app.db.models.user import UserModel, UserRole

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = getLogger(__name__)


def ensure_admin_role(db: Session, email: str) -> str:
    """Idempotently grant the ``admin`` role to the user with ``email``.

    Returns one of:

      - ``"promoted"``: the user was a regular user and is now an admin
      - ``"already_admin"``: the user already has the admin role (no-op)
      - ``"not_found"``: no user has this email

    The email is matched case-insensitively. Safe to call repeatedly (for
    example on every deploy) without side effects.
    """
    lookup = email.strip().lower()
    if not lookup:
        return "not_found"

    user = db.query(UserModel).filter(func.lower(UserModel.email) == lookup).first()
    if user is None:
        return "not_found"
    if user.role == UserRole.ADMIN.value:
        return "already_admin"

    user.role = UserRole.ADMIN.value
    db.commit()
    logger.info("Promoted %s (%s) to admin", user.email, user.id)
    return "promoted"
