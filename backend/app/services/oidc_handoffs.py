"""Single-use handoff codes that keep Melora JWTs out of browser URLs."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import or_, update
from sqlalchemy.orm import Session

from app.db.models.oidc_login_handoff import OIDCLoginHandoffModel
from app.services.auth import AuthService


class OIDCLoginHandoffService:
    LIFETIME_SECONDS = 60

    @staticmethod
    def create(db: Session, user_id: str) -> str:
        """Create a random one-time code and persist only its SHA-256 digest."""
        now = datetime.now(UTC)
        db.query(OIDCLoginHandoffModel).filter(
            or_(
                OIDCLoginHandoffModel.expires_at <= now,
                OIDCLoginHandoffModel.consumed_at.is_not(None),
            )
        ).delete(synchronize_session=False)

        raw_code = secrets.token_urlsafe(32)
        digest = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
        db.add(
            OIDCLoginHandoffModel(
                token_hash=digest,
                user_id=user_id,
                expires_at=now + timedelta(seconds=OIDCLoginHandoffService.LIFETIME_SECONDS),
            )
        )
        db.commit()
        return raw_code

    @staticmethod
    def exchange(db: Session, raw_code: str) -> dict[str, str]:
        """Atomically consume a valid code and issue Melora access/refresh tokens."""
        if not raw_code or len(raw_code) > 256:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired sign-in handoff",
            )

        now = datetime.now(UTC)
        digest = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
        handoff = (
            db.query(OIDCLoginHandoffModel)
            .filter(
                OIDCLoginHandoffModel.token_hash == digest,
                OIDCLoginHandoffModel.consumed_at.is_(None),
                OIDCLoginHandoffModel.expires_at > now,
            )
            .first()
        )
        if handoff is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired sign-in handoff",
            )

        result = db.execute(
            update(OIDCLoginHandoffModel)
            .where(
                OIDCLoginHandoffModel.id == handoff.id,
                OIDCLoginHandoffModel.consumed_at.is_(None),
                OIDCLoginHandoffModel.expires_at > now,
            )
            .values(consumed_at=now)
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sign-in handoff has already been used",
            )

        user_id = handoff.user_id
        db.commit()
        user = AuthService.get_user_by_id(db, user_id)
        return AuthService.create_tokens_for_user(user)
