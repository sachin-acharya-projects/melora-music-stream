from typing import Any

from fastapi import APIRouter, Response, status

from app.api.deps.auth import CurrentUser
from app.core.scopes import serialize_scope_catalog
from app.db.base import SessionDep
from app.schemas.oauth_applications import (
    OAuthApplicationCreate,
    OAuthApplicationResponse,
)
from app.schemas.personal_access_tokens import (
    PersonalAccessTokenCreate,
    PersonalAccessTokenCreated,
    PersonalAccessTokenResponse,
)
from app.services.oauth_applications import OAuthApplicationService
from app.services.personal_access_tokens import PersonalAccessTokenService

router = APIRouter()


@router.get("/scopes", response_model=list[dict[str, str | bool]])
def list_api_scopes() -> list[dict[str, str | bool]]:
    """Return the canonical scope catalog for developer consent screens."""
    return serialize_scope_catalog()


@router.post(
    "/tokens",
    response_model=PersonalAccessTokenCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_personal_access_token(
    data: PersonalAccessTokenCreate,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, Any]:
    """Create a PAT and return its raw value exactly once."""
    return PersonalAccessTokenService.create(
        db,
        user,
        name=data.name,
        scopes=data.scopes,
        expires_in_days=data.expires_in_days,
    )


@router.get("/tokens", response_model=list[PersonalAccessTokenResponse])
def list_personal_access_tokens(
    user: CurrentUser,
    db: SessionDep,
) -> list[PersonalAccessTokenResponse]:
    """List the caller's token metadata without exposing token values or hashes."""
    return [
        PersonalAccessTokenResponse.model_validate(record)
        for record in PersonalAccessTokenService.list_for_user(db, user)
    ]


@router.delete("/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_personal_access_token(
    token_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    """Revoke one of the caller's personal access tokens."""
    PersonalAccessTokenService.revoke(db, user, token_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)



@router.post(
    "/applications",
    response_model=OAuthApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_oauth_application(
    data: OAuthApplicationCreate,
    user: CurrentUser,
    db: SessionDep,
) -> dict[str, Any]:
    """Register an OAuth application; confidential secrets are returned once."""
    return OAuthApplicationService.create(
        db,
        user,
        name=data.name,
        description=data.description,
        redirect_uris=data.redirect_uris,
        allowed_scopes=data.allowed_scopes,
        is_confidential=data.is_confidential,
    )


@router.get("/applications", response_model=list[OAuthApplicationResponse])
def list_oauth_applications(
    user: CurrentUser,
    db: SessionDep,
) -> list[OAuthApplicationResponse]:
    """List the current user's OAuth applications without client secrets."""
    return [
        OAuthApplicationResponse.model_validate(app)
        for app in OAuthApplicationService.list_for_owner(db, user)
    ]


@router.delete("/applications/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_oauth_application(
    app_id: str,
    user: CurrentUser,
    db: SessionDep,
) -> Response:
    """Deactivate an OAuth application owned by the current user."""
    OAuthApplicationService.deactivate(db, user, app_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
