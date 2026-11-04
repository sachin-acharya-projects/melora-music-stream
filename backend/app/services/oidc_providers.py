from typing import Any
from urllib.parse import urlsplit

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.oidc_provider import OIDCProviderModel
from app.schemas.oidc import OIDCProviderCreate, OIDCProviderUpdate
from app.services.oidc_secrets import encrypt_oidc_client_secret


def _validate_https_url(value: str, field: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field} must be an HTTPS URL without embedded credentials",
        )
    return value


def _provider_response(provider: OIDCProviderModel) -> dict[str, Any]:
    return {
        "id": provider.id,
        "name": provider.name,
        "issuer": provider.issuer,
        "redirect_uri": f"{settings.BACKEND_URL.rstrip('/')}{settings.API_V1_STR}/auth/providers/{provider.id}/callback",
        "discovery_url": provider.discovery_url,
        "client_id": provider.client_id,
        "scopes": provider.scopes,
        "display_name": provider.display_name,
        "button_label": provider.button_label,
        "enabled": provider.enabled,
        "auto_provision": provider.auto_provision,
        "sort_order": provider.sort_order,
        "has_client_secret": bool(provider.client_secret_encrypted),
    }


class OIDCProviderService:
    """Admin operations for configured external OIDC identity providers."""

    @staticmethod
    def list(db: Session, *, enabled_only: bool = False) -> list[dict[str, Any]]:
        query = db.query(OIDCProviderModel)
        if enabled_only:
            query = query.filter(OIDCProviderModel.enabled.is_(True))
        providers = query.order_by(OIDCProviderModel.sort_order, OIDCProviderModel.display_name).all()
        return [_provider_response(provider) for provider in providers]

    @staticmethod
    def list_public(db: Session) -> list[dict[str, Any]]:
        """Return only enabled provider labels required by the sign-in screen."""
        providers = (
            db.query(OIDCProviderModel)
            .filter(OIDCProviderModel.enabled.is_(True))
            .order_by(OIDCProviderModel.sort_order, OIDCProviderModel.display_name)
            .all()
        )
        return [
            {
                "id": provider.id,
                "name": provider.name,
                "display_name": provider.display_name,
                "button_label": provider.button_label,
                "sort_order": provider.sort_order,
            }
            for provider in providers
        ]

    @staticmethod
    def create(db: Session, data: OIDCProviderCreate) -> dict[str, Any]:
        issuer = _validate_https_url(data.issuer, "issuer")
        discovery_url = (
            _validate_https_url(data.discovery_url, "discovery_url")
            if data.discovery_url
            else None
        )
        if data.enabled and not data.client_secret:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="An enabled confidential OIDC provider requires a client secret",
            )
        provider = OIDCProviderModel(
            name=data.name,
            issuer=issuer,
            discovery_url=discovery_url,
            client_id=data.client_id,
            client_secret_encrypted=(
                encrypt_oidc_client_secret(data.client_secret) if data.client_secret else None
            ),
            scopes=data.scopes,
            display_name=data.display_name,
            button_label=data.button_label,
            enabled=data.enabled,
            auto_provision=data.auto_provision,
            sort_order=data.sort_order,
        )
        db.add(provider)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A provider with this name or issuer already exists",
            ) from exc
        db.refresh(provider)
        return _provider_response(provider)

    @staticmethod
    def update(db: Session, provider_id: str, data: OIDCProviderUpdate) -> dict[str, Any]:
        provider = db.query(OIDCProviderModel).filter(OIDCProviderModel.id == provider_id).first()
        if provider is None:
            raise HTTPException(status_code=404, detail="OIDC provider not found")
        changes = data.model_dump(exclude_unset=True)
        secret = changes.pop("client_secret", None)
        if secret is not None:
            provider.client_secret_encrypted = encrypt_oidc_client_secret(secret)
        for field, value in changes.items():
            if field == "discovery_url" and value is not None:
                value = _validate_https_url(value, "discovery_url")
            if value is not None or field in {"button_label", "discovery_url"}:
                setattr(provider, field, value)
        if provider.enabled and not provider.client_secret_encrypted:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="An enabled confidential OIDC provider requires a client secret",
            )
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="Provider update conflicts with an existing provider") from exc
        db.refresh(provider)
        return _provider_response(provider)

    @staticmethod
    def delete(db: Session, provider_id: str) -> None:
        provider = db.query(OIDCProviderModel).filter(OIDCProviderModel.id == provider_id).first()
        if provider is None:
            raise HTTPException(status_code=404, detail="OIDC provider not found")
        db.delete(provider)
        db.commit()
