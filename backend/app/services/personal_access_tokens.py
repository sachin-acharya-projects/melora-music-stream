"""Lifecycle and authentication for hashed personal access tokens."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.personal_access_token import PersonalAccessTokenModel
from app.db.models.user import UserModel
from app.services.authorization import validate_scope_grant


class PersonalAccessTokenService:
    TOKEN_PREFIX = "mlpat_"

    @staticmethod
    def create(
        db: Session,
        user: UserModel,
        *,
        name: str,
        scopes: list[str],
        expires_in_days: int = 30,
    ) -> dict[str, object]:
        """Create a PAT; the raw token is returned once and never persisted."""
        if not 1 <= expires_in_days <= 365:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Token lifetime must be between 1 and 365 days",
            )
        granted_scopes = validate_scope_grant(user, scopes)
        raw_token = PersonalAccessTokenService.TOKEN_PREFIX + secrets.token_urlsafe(32)
        now = datetime.now(UTC)
        record = PersonalAccessTokenModel(
            user_id=user.id,
            name=name.strip(),
            token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
            token_prefix=raw_token[:20],
            scopes=sorted(granted_scopes),
            expires_at=now + timedelta(days=expires_in_days),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "id": record.id,
            "name": record.name,
            "token_prefix": record.token_prefix,
            "scopes": record.scopes,
            "expires_at": record.expires_at,
            "last_used_at": record.last_used_at,
            "created_at": record.created_at,
            "revoked_at": record.revoked_at,
            "token": raw_token,
        }

    @staticmethod
    def list_for_user(db: Session, user: UserModel) -> list[PersonalAccessTokenModel]:
        """List the caller's PAT metadata; never return hashes or raw secrets."""
        return (
            db.query(PersonalAccessTokenModel)
            .filter(PersonalAccessTokenModel.user_id == user.id)
            .order_by(PersonalAccessTokenModel.created_at.desc())
            .all()
        )

    @staticmethod
    def revoke(db: Session, user: UserModel, token_id: str) -> None:
        """Revoke a PAT owned by the caller."""
        record = (
            db.query(PersonalAccessTokenModel)
            .filter(
                PersonalAccessTokenModel.id == token_id,
                PersonalAccessTokenModel.user_id == user.id,
            )
            .first()
        )
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Personal access token not found",
            )
        if record.revoked_at is None:
            record.revoked_at = datetime.now(UTC)
            db.commit()

    @staticmethod
    def authenticate(db: Session, raw_token: str) -> tuple[UserModel, frozenset[str], str]:
        """Authenticate a raw PAT and update its last-used timestamp."""
        if not raw_token.startswith(PersonalAccessTokenService.TOKEN_PREFIX):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid personal access token",
            )
        digest = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        record = (
            db.query(PersonalAccessTokenModel)
            .filter(PersonalAccessTokenModel.token_hash == digest)
            .first()
        )
        now = datetime.now(UTC)
        if (
            record is None
            or record.revoked_at is not None
            or PersonalAccessTokenService._is_expired(record.expires_at, now)
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired personal access token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = db.query(UserModel).filter(UserModel.id == record.user_id).first()
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token owner is unavailable",
            )

        granted_scopes = validate_scope_grant(user, record.scopes)
        record.last_used_at = now
        db.commit()
        return user, granted_scopes, record.id

    @staticmethod
    def _is_expired(expires_at: datetime, now: datetime) -> bool:
        """Compare database timestamps safely across SQLite and PostgreSQL."""
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return expires_at <= now
