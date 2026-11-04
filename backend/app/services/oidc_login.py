"""OIDC subject resolution and account-linking policy."""

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.external_identity import ExternalIdentityModel
from app.db.models.oidc_provider import OIDCProviderModel
from app.db.models.user import UserModel, UserRole


class OIDCLoginService:
    @staticmethod
    def _username(db: Session, email: str, display_name: str | None) -> str:
        base = (display_name or email.split("@", maxsplit=1)[0]).lower()
        base = "_".join(part for part in base.replace(".", " ").replace("-", " ").split() if part)
        base = base[:48] or "listener"
        candidate = base
        counter = 1
        while db.query(UserModel.id).filter(UserModel.username == candidate).first():
            candidate = f"{base[:42]}_{counter}"
            counter += 1
        return candidate

    @staticmethod
    def resolve_login_user(
        db: Session,
        provider: OIDCProviderModel,
        *,
        subject: str,
        email: str | None,
        email_verified: bool,
        display_name: str | None,
    ) -> UserModel:
        email = email.strip().lower() if email else None
        identity = (
            db.query(ExternalIdentityModel)
            .filter(
                ExternalIdentityModel.issuer == provider.issuer,
                ExternalIdentityModel.subject == subject,
            )
            .first()
        )
        if identity:
            user = db.query(UserModel).filter(UserModel.id == identity.user_id).first()
            if not user or not user.is_active:
                raise HTTPException(status_code=403, detail="Melora account is inactive")
            identity.email = email
            identity.email_verified = email_verified
            identity.display_name = display_name
            db.commit()
            return user

        if email:
            existing = db.query(UserModel).filter(func.lower(UserModel.email) == email).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account already uses this email. Sign in and link this identity.",
                )

        if not provider.auto_provision:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This identity provider does not allow automatic account creation",
            )
        if not email or not email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A verified email address is required to create a Melora account",
            )

        user = UserModel(
            email=email,
            username=OIDCLoginService._username(db, email, display_name),
            display_name=display_name,
            role=UserRole.USER,
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add(
            ExternalIdentityModel(
                user_id=user.id,
                provider_id=provider.id,
                issuer=provider.issuer,
                subject=subject,
                email=email,
                email_verified=email_verified,
                display_name=display_name,
            )
        )
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This external identity or email is already registered",
            ) from exc
        db.refresh(user)
        return user

    @staticmethod
    def link_identity(
        db: Session,
        provider: OIDCProviderModel,
        user: UserModel,
        *,
        subject: str,
        email: str | None,
        email_verified: bool,
        display_name: str | None,
    ) -> None:
        email = email.strip().lower() if email else None
        existing = (
            db.query(ExternalIdentityModel)
            .filter(
                ExternalIdentityModel.issuer == provider.issuer,
                ExternalIdentityModel.subject == subject,
            )
            .first()
        )
        if existing:
            if existing.user_id == user.id:
                raise HTTPException(status_code=409, detail="Identity is already linked")
            raise HTTPException(status_code=409, detail="Identity belongs to another Melora account")

        db.add(
            ExternalIdentityModel(
                user_id=user.id,
                provider_id=provider.id,
                issuer=provider.issuer,
                subject=subject,
                email=email,
                email_verified=email_verified,
                display_name=display_name,
            )
        )
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="Identity could not be linked") from exc
