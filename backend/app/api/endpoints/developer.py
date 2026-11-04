from typing import Any

from fastapi import APIRouter, Response, status

from app.api.deps.auth import CurrentUser
from app.core.scopes import serialize_scope_catalog
from app.db.base import SessionDep
from app.schemas.personal_access_tokens import (
    PersonalAccessTokenCreate,
    PersonalAccessTokenCreated,
    PersonalAccessTokenResponse,
)
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
