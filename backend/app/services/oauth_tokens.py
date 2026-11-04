"""OAuth authorization-code, PKCE, client authentication, and refresh rotation."""

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.scopes import normalize_scopes
from app.db.models.oauth_application import OAuthApplicationModel
from app.db.models.oauth_tokens import (
    OAuthAuthorizationCodeModel,
    OAuthRefreshTokenModel,
)
from app.db.models.user import UserModel
from app.schemas.oauth import OAuthAuthorizeRequest, OAuthTokenRequest
from app.services.auth import AuthService
from app.services.authorization import validate_scope_grant
from app.services.oauth_applications import OAuthApplicationService


class OAuthTokenService:
    AUTHORIZATION_CODE_LIFETIME_SECONDS = 300

    @staticmethod
    def authorize(
        db: Session,
        user: UserModel,
        request: OAuthAuthorizeRequest,
    ) -> str:
        """Validate consent request and return the registered redirect with code/state."""
        app = OAuthTokenService._get_application(db, request.client_id)
        redirect_uri = OAuthApplicationService.validate_redirect_uri(request.redirect_uri)
        if redirect_uri not in app.redirect_uris:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="redirect_uri does not exactly match a registered URI",
            )

        owner = AuthService.get_user_by_id(db, app.owner_user_id)
        scopes = validate_scope_grant(user, request.scopes)
        validate_scope_grant(owner, request.scopes)
        if not scopes.issubset(normalize_scopes(app.allowed_scopes)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requested scopes exceed this application's registered scope ceiling",
            )

        raw_code = secrets.token_urlsafe(32)
        now = datetime.now(UTC)
        db.add(
            OAuthAuthorizationCodeModel(
                application_id=app.id,
                user_id=user.id,
                code_hash=hashlib.sha256(raw_code.encode("utf-8")).hexdigest(),
                redirect_uri=redirect_uri,
                scopes=sorted(scopes),
                code_challenge=request.code_challenge,
                expires_at=now
                + timedelta(seconds=OAuthTokenService.AUTHORIZATION_CODE_LIFETIME_SECONDS),
            )
        )
        db.commit()

        parts = urlsplit(redirect_uri)
        query = [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key not in {"code", "state"}
        ]
        query.extend([("code", raw_code), ("state", request.state)])
        return urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), "")
        )

    @staticmethod
    def exchange(
        db: Session,
        request: OAuthTokenRequest,
    ) -> dict[str, str | int]:
        """Exchange an authorization code or rotate an OAuth refresh token."""
        app = OAuthTokenService._authenticate_client(
            db, request.client_id, request.client_secret
        )
        if request.grant_type == "authorization_code":
            if not request.code or not request.redirect_uri or not request.code_verifier:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="code, redirect_uri, and code_verifier are required",
                )
            user, scopes = OAuthTokenService._consume_authorization_code(
                db,
                app,
                request.code,
                request.redirect_uri,
                request.code_verifier,
            )
            family_id = secrets.token_hex(32)
        else:
            if not request.refresh_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="refresh_token is required",
                )
            user, scopes, family_id = OAuthTokenService._rotate_refresh_token(
                db, app, request.refresh_token
            )

        owner = AuthService.get_user_by_id(db, app.owner_user_id)
        scopes = validate_scope_grant(owner, scopes)
        scopes = validate_scope_grant(user, scopes)
        access_token = AuthService.create_delegated_access_token(
            user,
            sorted(scopes),
            client_id=app.client_id,
        )
        refresh_token = OAuthTokenService._create_refresh_token(
            db,
            app,
            user,
            sorted(scopes),
            family_id,
        )
        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": settings.DELEGATED_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_token": refresh_token,
            "scope": " ".join(sorted(scopes)),
        }

    @staticmethod
    def _consume_authorization_code(
        db: Session,
        app: OAuthApplicationModel,
        raw_code: str,
        redirect_uri: str,
        code_verifier: str,
    ) -> tuple[UserModel, frozenset[str]]:
        """Validate PKCE and atomically consume a one-time authorization code."""
        if not 43 <= len(code_verifier) <= 128 or not all(
            char.isalnum() or char in "-._~" for char in code_verifier
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PKCE code_verifier",
            )
        challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("ascii")).digest()
        ).rstrip(b"=").decode("ascii")
        digest = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
        now = datetime.now(UTC)
        record = (
            db.query(OAuthAuthorizationCodeModel)
            .filter(
                OAuthAuthorizationCodeModel.code_hash == digest,
                OAuthAuthorizationCodeModel.application_id == app.id,
                OAuthAuthorizationCodeModel.redirect_uri == redirect_uri,
                OAuthAuthorizationCodeModel.consumed_at.is_(None),
                OAuthAuthorizationCodeModel.expires_at > now,
            )
            .first()
        )
        if record is None or not hmac.compare_digest(record.code_challenge, challenge):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid, expired, or already-used authorization code",
            )

        result = db.execute(
            update(OAuthAuthorizationCodeModel)
            .where(
                OAuthAuthorizationCodeModel.id == record.id,
                OAuthAuthorizationCodeModel.consumed_at.is_(None),
                OAuthAuthorizationCodeModel.expires_at > now,
            )
            .values(consumed_at=now)
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization code has already been used",
            )

        user_id = record.user_id
        granted_scopes = normalize_scopes(record.scopes)
        db.commit()
        user = AuthService.get_user_by_id(db, user_id)
        return user, granted_scopes

    @staticmethod
    def _rotate_refresh_token(
        db: Session,
        app: OAuthApplicationModel,
        raw_token: str,
    ) -> tuple[UserModel, frozenset[str], str]:
        """Rotate a refresh token; reuse revokes the entire token family."""
        digest = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        record = (
            db.query(OAuthRefreshTokenModel)
            .filter(
                OAuthRefreshTokenModel.token_hash == digest,
                OAuthRefreshTokenModel.application_id == app.id,
            )
            .first()
        )
        now = datetime.now(UTC)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid refresh token",
            )
        if record.consumed_at is not None:
            db.query(OAuthRefreshTokenModel).filter(
                OAuthRefreshTokenModel.family_id == record.family_id
            ).update(
                {OAuthRefreshTokenModel.revoked_at: now},
                synchronize_session=False,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token reuse detected; this token family was revoked",
            )
        if (
            record.revoked_at is not None
            or OAuthTokenService._is_expired(record.expires_at, now)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired refresh token",
            )

        result = db.execute(
            update(OAuthRefreshTokenModel)
            .where(
                OAuthRefreshTokenModel.id == record.id,
                OAuthRefreshTokenModel.consumed_at.is_(None),
                OAuthRefreshTokenModel.revoked_at.is_(None),
                OAuthRefreshTokenModel.expires_at > now,
            )
            .values(consumed_at=now)
        )
        if result.rowcount != 1:
            db.rollback()
            db.query(OAuthRefreshTokenModel).filter(
                OAuthRefreshTokenModel.family_id == record.family_id
            ).update(
                {OAuthRefreshTokenModel.revoked_at: now},
                synchronize_session=False,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token reuse detected; this token family was revoked",
            )

        user_id = record.user_id
        scopes = normalize_scopes(record.scopes)
        family_id = record.family_id
        db.commit()
        user = AuthService.get_user_by_id(db, user_id)
        return user, scopes, family_id

    @staticmethod
    def _create_refresh_token(
        db: Session,
        app: OAuthApplicationModel,
        user: UserModel,
        scopes: list[str],
        family_id: str,
    ) -> str:
        raw_token = "mloref_" + secrets.token_urlsafe(48)
        db.add(
            OAuthRefreshTokenModel(
                application_id=app.id,
                user_id=user.id,
                family_id=family_id,
                token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
                scopes=scopes,
                expires_at=datetime.now(UTC)
                + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
            )
        )
        db.commit()
        return raw_token

    @staticmethod
    def _authenticate_client(
        db: Session,
        client_id: str,
        client_secret: str | None,
    ) -> OAuthApplicationModel:
        app = OAuthTokenService._get_application(db, client_id)
        if app.is_confidential:
            if not client_secret or not app.client_secret_hash:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Client authentication failed",
                )
            supplied_hash = hashlib.sha256(client_secret.encode("utf-8")).hexdigest()
            if not hmac.compare_digest(supplied_hash, app.client_secret_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Client authentication failed",
                )
        elif client_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Public clients must not use a client secret",
            )
        return app

    @staticmethod
    def _get_application(db: Session, client_id: str) -> OAuthApplicationModel:
        app = (
            db.query(OAuthApplicationModel)
            .filter(
                OAuthApplicationModel.client_id == client_id,
                OAuthApplicationModel.is_active.is_(True),
            )
            .first()
        )
        if app is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unknown or inactive OAuth client",
            )
        return app

    @staticmethod
    def _is_expired(expires_at: datetime, now: datetime) -> bool:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return expires_at <= now
