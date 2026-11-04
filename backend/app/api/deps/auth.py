from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.machine_client import MachineClientModel
from app.db.models.user import UserModel, UserRole
from app.services.auth import AuthService
from app.services.authorization import require_delegated_scopes
from app.services.machine_clients import MachineClientService
from app.services.personal_access_tokens import PersonalAccessTokenService

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> UserModel:
    """Get current user from JWT token, fetched from DB."""
    token = credentials.credentials if credentials else None
    return AuthService.get_current_user_from_token(token, db=db)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> UserModel | None:
    """Get current user from JWT token. Returns None if not authenticated."""
    token = credentials.credentials if credentials else None
    return AuthService.get_current_user_from_token_optional(token, db=db)


CurrentUser = Annotated[UserModel, Depends(get_current_user)]
OptionalUser = Annotated[UserModel | None, Depends(get_current_user_optional)]


def require_role(*roles: UserRole) -> Callable[..., UserModel]:
    """Dependency factory that requires the user to have one of the specified roles."""

    def role_checker(user: UserModel = Depends(get_current_user)) -> UserModel:
        AuthService.require_role(user, *roles)
        return user

    return role_checker


require_admin = require_role(UserRole.ADMIN)
require_user = require_role(UserRole.ADMIN, UserRole.USER)


@dataclass(frozen=True, slots=True)
class DelegatedPrincipal:
    """Authenticated user plus the explicit scopes carried by a delegated token."""

    user: UserModel
    scopes: frozenset[str]
    credential_id: str | None = None


def require_scopes(*required_scopes: str) -> Callable[..., DelegatedPrincipal]:
    """Dependency for endpoints that require an explicitly scoped delegated token."""

    def delegated_checker(
        credentials: HTTPAuthorizationCredentials | None = Depends(security),
        db: Session = Depends(get_db),
    ) -> DelegatedPrincipal:
        token = credentials.credentials if credentials else None
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = AuthService.decode_token(token)
        if (
            payload
            and payload.get("type") == "access"
            and payload.get("credential_type") == "delegated"
        ):
            user_id = payload.get("sub")
            raw_scopes = payload.get("scopes")
            if not isinstance(user_id, str) or not isinstance(raw_scopes, list) or not all(
                isinstance(scope, str) for scope in raw_scopes
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Delegated token claims are invalid",
                )
            user = AuthService.get_user_by_id(db, user_id)
            scopes = require_delegated_scopes(user, raw_scopes, required_scopes)
            return DelegatedPrincipal(user=user, scopes=scopes)

        if token.startswith(PersonalAccessTokenService.TOKEN_PREFIX):
            user, raw_scopes, credential_id = PersonalAccessTokenService.authenticate(
                db, token
            )
            scopes = require_delegated_scopes(user, raw_scopes, required_scopes)
            return DelegatedPrincipal(
                user=user,
                scopes=scopes,
                credential_id=credential_id,
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A delegated access token or personal access token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return delegated_checker



@dataclass(frozen=True, slots=True)
class MachinePrincipal:
    """Independent machine identity plus its explicit client-credentials scopes."""

    client: MachineClientModel
    scopes: frozenset[str]


def require_machine_scopes(*required_scopes: str) -> Callable[..., MachinePrincipal]:
    """Dependency for service endpoints that accept machine client credentials."""

    def machine_checker(
        credentials: HTTPAuthorizationCredentials | None = Depends(security),
        db: Session = Depends(get_db),
    ) -> MachinePrincipal:
        token = credentials.credentials if credentials else None
        payload = AuthService.decode_token(token) if token else None
        if (
            not payload
            or payload.get("type") != "access"
            or payload.get("credential_type") != "machine"
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="A machine access token is required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        client_id = payload.get("client_id")
        service_identity = payload.get("sub")
        raw_scopes = payload.get("scopes")
        if (
            not isinstance(client_id, str)
            or not isinstance(service_identity, str)
            or not isinstance(raw_scopes, list)
            or not all(isinstance(scope, str) for scope in raw_scopes)
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Machine token claims are invalid",
            )

        client, granted = MachineClientService.validate_access_token(
            db,
            client_id=client_id,
            service_identity=service_identity,
            granted_scopes=raw_scopes,
        )
        required = require_delegated_scopes(
            _machine_scope_user(client, db),
            granted,
            required_scopes,
        )
        return MachinePrincipal(client=client, scopes=required)

    return machine_checker


def _machine_scope_user(client: MachineClientModel, db: Session) -> UserModel:
    """Resolve the client owner only to reapply the owner's current scope ceiling."""
    return AuthService.get_user_by_id(db, client.owner_user_id)
