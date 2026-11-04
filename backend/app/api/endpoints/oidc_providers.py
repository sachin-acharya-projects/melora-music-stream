from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import SessionDep
from app.api.deps.auth import require_admin_scopes
from app.db.models.user import UserModel
from app.schemas.oidc import OIDCProviderCreate, OIDCProviderResponse, OIDCProviderUpdate
from app.services.oidc_providers import OIDCProviderService

router = APIRouter()
OIDCProviderReadAdmin = Annotated[UserModel, Depends(require_admin_scopes("admin:identity:read"))]
OIDCProviderWriteAdmin = Annotated[UserModel, Depends(require_admin_scopes("admin:identity:write"))]


@router.get(
    "/oidc-providers",
    response_model=list[OIDCProviderResponse],
)
def list_oidc_providers(
    db: SessionDep,
    _: OIDCProviderReadAdmin,
) -> list[dict[str, Any]]:
    """List configured OIDC providers. Client secrets are never returned."""
    return OIDCProviderService.list_providers(db)


@router.post(
    "/oidc-providers",
    response_model=OIDCProviderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_oidc_provider(
    data: OIDCProviderCreate,
    db: SessionDep,
    _: OIDCProviderWriteAdmin,
) -> dict[str, Any]:
    """Register an external OIDC provider."""
    return OIDCProviderService.create(db, data)


@router.patch(
    "/oidc-providers/{provider_id}",
    response_model=OIDCProviderResponse,
)
def update_oidc_provider(
    provider_id: str,
    data: OIDCProviderUpdate,
    db: SessionDep,
    _: OIDCProviderWriteAdmin,
) -> dict[str, Any]:
    """Update provider configuration; omit client_secret to keep the current secret."""
    return OIDCProviderService.update(db, provider_id, data)


@router.delete(
    "/oidc-providers/{provider_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_oidc_provider(
    provider_id: str,
    db: SessionDep,
    _: OIDCProviderWriteAdmin,
) -> Response:
    """Delete a provider and its linked external identities."""
    OIDCProviderService.delete(db, provider_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
