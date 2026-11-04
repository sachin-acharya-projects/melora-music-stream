"""Shared authorization policy for delegated API credentials.

Browser JWTs continue to authenticate a Melora user; delegated credentials must
carry explicit scopes and are checked separately by this module.
"""

from collections.abc import Iterable

from fastapi import HTTPException, status

from app.core.scopes import (
    ADMIN_SCOPES,
    SCOPE_CATALOG,
    UnknownScopeError,
    normalize_scopes,
)
from app.db.models.user import UserModel, UserRole


def effective_scope_ceiling(user: UserModel) -> frozenset[str]:
    """Return the maximum delegated scopes this user may grant to an app/client."""
    scopes = set(SCOPE_CATALOG)
    if user.role != UserRole.ADMIN.value:
        scopes.difference_update(ADMIN_SCOPES)
    return frozenset(scopes)


def validate_scope_grant(
    user: UserModel,
    requested_scopes: Iterable[str],
    *,
    allowed_scopes: Iterable[str] | None = None,
) -> frozenset[str]:
    """Validate both the catalog and the registering user's effective permission ceiling."""
    try:
        requested = normalize_scopes(tuple(requested_scopes))
        if not requested:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one scope must be requested",
            )
        ceiling = (
            effective_scope_ceiling(user)
            if allowed_scopes is None
            else normalize_scopes(tuple(allowed_scopes))
        )
    except UnknownScopeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if not requested.issubset(ceiling):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requested scopes exceed the user's effective permissions",
        )
    return requested


def require_delegated_scopes(
    user: UserModel,
    granted_scopes: Iterable[str],
    required_scopes: Iterable[str],
    *,
    resource_owner_id: str | None = None,
) -> frozenset[str]:
    """Enforce delegated scopes, role ceilings, and optional user-resource ownership."""
    granted = validate_scope_grant(user, granted_scopes)
    try:
        required = normalize_scopes(tuple(required_scopes))
    except UnknownScopeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The endpoint declares an unknown authorization scope",
        ) from exc

    if not required.issubset(granted):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The credential does not grant the required scope",
        )
    if resource_owner_id is not None and resource_owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The credential cannot access another user's private resource",
        )
    return granted
