"""Registration and lifecycle operations for user-owned OAuth clients."""

import hashlib
import re
import secrets
from urllib.parse import urlsplit

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.oauth_application import OAuthApplicationModel
from app.db.models.user import UserModel
from app.services.authorization import validate_scope_grant


class OAuthApplicationService:
    @staticmethod
    def validate_redirect_uri(uri: str) -> str:
        """Validate an exact OAuth redirect URI without wildcards or fragments."""
        value = uri.strip()
        try:
            parsed = urlsplit(value)
            _ = parsed.port
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid OAuth redirect URI: {uri}",
            ) from exc
        if (
            not value
            or len(value) > 2048
            or not parsed.scheme
            or parsed.username
            or parsed.password
            or parsed.fragment
            or "*" in value
            or "\\" in value
            or any(ord(character) < 32 for character in value)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid OAuth redirect URI: {uri}",
            )

        if parsed.scheme in {"https", "http"}:
            if not parsed.hostname:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid OAuth redirect URI: {uri}",
                )
            is_loopback = parsed.hostname.lower() in {
                "localhost",
                "127.0.0.1",
                "::1",
            }
            if parsed.scheme != "https" and not (
                parsed.scheme == "http" and is_loopback
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="OAuth redirect URIs must use HTTPS except for loopback development URLs",
                )
        elif not re.fullmatch(r"[a-z][a-z0-9+.-]*", parsed.scheme) or "." not in parsed.scheme:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Custom OAuth redirect schemes must use a reverse-domain name",
            )

        return value

    @staticmethod
    def create(
        db: Session,
        owner: UserModel,
        *,
        name: str,
        description: str | None,
        redirect_uris: list[str],
        allowed_scopes: list[str],
        is_confidential: bool = True,
    ) -> dict[str, object]:
        """Register an OAuth app; show a generated client secret only once."""
        if not name.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Application name cannot be blank",
            )
        redirects = [
            OAuthApplicationService.validate_redirect_uri(uri) for uri in redirect_uris
        ]
        if len(set(redirects)) != len(redirects):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="OAuth redirect URIs must be unique",
            )
        scopes = validate_scope_grant(owner, allowed_scopes)
        client_id = secrets.token_urlsafe(24)
        client_secret = (
            secrets.token_urlsafe(48) if is_confidential else None
        )
        app = OAuthApplicationModel(
            owner_user_id=owner.id,
            name=name.strip(),
            description=description.strip() if description else None,
            client_id=client_id,
            client_secret_hash=(
                hashlib.sha256(client_secret.encode("utf-8")).hexdigest()
                if client_secret
                else None
            ),
            redirect_uris=redirects,
            allowed_scopes=sorted(scopes),
            is_confidential=is_confidential,
            is_active=True,
        )
        db.add(app)
        db.commit()
        db.refresh(app)
        return {
            "id": app.id,
            "name": app.name,
            "description": app.description,
            "client_id": app.client_id,
            "redirect_uris": app.redirect_uris,
            "allowed_scopes": app.allowed_scopes,
            "is_confidential": app.is_confidential,
            "is_active": app.is_active,
            "created_at": app.created_at.isoformat(),
            "client_secret": client_secret,
        }

    @staticmethod
    def list_for_owner(db: Session, owner: UserModel) -> list[OAuthApplicationModel]:
        """List only the current user's registered applications."""
        return (
            db.query(OAuthApplicationModel)
            .filter(OAuthApplicationModel.owner_user_id == owner.id)
            .order_by(OAuthApplicationModel.created_at.desc())
            .all()
        )

    @staticmethod
    def deactivate(db: Session, owner: UserModel, app_id: str) -> None:
        """Deactivate an application owned by the current user."""
        app = (
            db.query(OAuthApplicationModel)
            .filter(
                OAuthApplicationModel.id == app_id,
                OAuthApplicationModel.owner_user_id == owner.id,
            )
            .first()
        )
        if app is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OAuth application not found",
            )
        if app.is_active:
            app.is_active = False
            db.commit()
