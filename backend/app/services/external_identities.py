from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.external_identity import ExternalIdentityModel
from app.db.models.oidc_provider import OIDCProviderModel
from app.db.models.user import UserModel


class ExternalIdentityService:
    """Read and safely unlink external identities for the signed-in user."""

    @staticmethod
    def list_for_user(db: Session, user: UserModel) -> list[dict[str, Any]]:
        rows = (
            db.query(ExternalIdentityModel, OIDCProviderModel)
            .join(OIDCProviderModel, OIDCProviderModel.id == ExternalIdentityModel.provider_id)
            .filter(ExternalIdentityModel.user_id == user.id)
            .order_by(ExternalIdentityModel.created_at)
            .all()
        )
        return [
            {
                "id": identity.id,
                "provider_id": provider.id,
                "provider_name": provider.display_name,
                "email": identity.email,
                "email_verified": identity.email_verified,
                "display_name": identity.display_name,
                "linked_at": identity.created_at,
            }
            for identity, provider in rows
        ]

    @staticmethod
    def unlink(db: Session, user: UserModel, identity_id: str) -> None:
        identity = (
            db.query(ExternalIdentityModel)
            .filter(
                ExternalIdentityModel.id == identity_id,
                ExternalIdentityModel.user_id == user.id,
            )
            .first()
        )
        if identity is None:
            raise HTTPException(status_code=404, detail="Linked identity not found")

        other_identity_exists = (
            db.query(ExternalIdentityModel.id)
            .filter(
                ExternalIdentityModel.user_id == user.id,
                ExternalIdentityModel.id != identity.id,
            )
            .first()
            is not None
        )
        has_legacy_google_login = bool(user.oauth_provider == "google" and user.oauth_id)
        if not user.password_hash and not other_identity_exists and not has_legacy_google_login:
            raise HTTPException(
                status_code=409,
                detail="Cannot unlink the only sign-in method. Add a password or another identity first.",
            )

        db.delete(identity)
        db.commit()
