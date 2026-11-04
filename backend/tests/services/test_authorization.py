import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api.deps.auth import (
    get_current_user,
    get_current_user_optional,
    require_scopes,
)
from app.core.scopes import ADMIN_SCOPES, ALL_SCOPES, normalize_scopes
from app.services.auth import AuthService
from app.services.authorization import (
    effective_scope_ceiling,
    require_delegated_scopes,
    validate_scope_grant,
)
from app.services.personal_access_tokens import PersonalAccessTokenService


def test_scope_catalog_contains_expected_families() -> None:
    prefixes = {scope.split(":", maxsplit=1)[0] for scope in ALL_SCOPES}

    assert {
        "profile",
        "library",
        "songs",
        "albums",
        "artists",
        "playlists",
        "history",
        "player",
        "uploads",
        "settings",
        "admin",
        "automation",
        "webhooks",
    }.issubset(prefixes)


def test_unknown_scope_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown scope"):
        normalize_scopes(["profile:read", "root:everything"])


def test_regular_user_cannot_grant_admin_scopes(test_user) -> None:
    ceiling = effective_scope_ceiling(test_user)

    assert not (ceiling & ADMIN_SCOPES)
    with pytest.raises(HTTPException) as exc:
        validate_scope_grant(test_user, ["profile:read", "admin:users:write"])

    assert exc.value.status_code == 403


def test_admin_can_grant_admin_scopes(admin_user) -> None:
    ceiling = effective_scope_ceiling(admin_user)

    assert ADMIN_SCOPES.issubset(ceiling)
    assert validate_scope_grant(admin_user, ["admin:users:read"]) == {
        "admin:users:read"
    }


def test_grant_must_be_within_explicit_app_ceiling(test_user) -> None:
    with pytest.raises(HTTPException) as exc:
        validate_scope_grant(
            test_user,
            ["profile:read", "library:read"],
            allowed_scopes=["profile:read"],
        )

    assert exc.value.status_code == 403


def test_delegated_access_requires_explicit_scope_and_owner(test_user) -> None:
    assert require_delegated_scopes(
        test_user,
        ["profile:read", "library:read"],
        ["profile:read"],
        resource_owner_id=test_user.id,
    ) == {"profile:read", "library:read"}

    with pytest.raises(HTTPException) as missing_scope:
        require_delegated_scopes(test_user, ["profile:read"], ["library:write"])

    assert missing_scope.value.status_code == 403

    with pytest.raises(HTTPException) as wrong_owner:
        require_delegated_scopes(
            test_user,
            ["profile:read"],
            ["profile:read"],
            resource_owner_id="another-user",
        )

    assert wrong_owner.value.status_code == 403


def test_delegated_access_token_contains_only_validated_scopes(test_user) -> None:
    token = AuthService.create_delegated_access_token(
        test_user,
        ["profile:read", "library:read"],
    )
    payload = AuthService.decode_token(token)

    assert payload is not None
    assert payload["credential_type"] == "delegated"
    assert payload["scopes"] == ["library:read", "profile:read"]


def test_delegated_access_token_cannot_exceed_user_role(admin_user, test_user) -> None:
    with pytest.raises(HTTPException) as exc:
        AuthService.create_delegated_access_token(
            test_user,
            ["admin:users:write"],
        )

    assert exc.value.status_code == 403

    admin_token = AuthService.create_delegated_access_token(
        admin_user,
        ["admin:users:write"],
    )
    payload = AuthService.decode_token(admin_token)
    assert payload is not None
    assert payload["scopes"] == ["admin:users:write"]


def test_browser_session_token_cannot_satisfy_delegated_scope_dependency(
    test_user, db
) -> None:
    browser_token = AuthService.create_access_token(
        {"sub": test_user.id, "email": test_user.email}
    )
    dependency = require_scopes("profile:read")

    with pytest.raises(HTTPException) as exc:
        dependency(
            credentials=HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials=browser_token,
            ),
            db=db,
        )

    assert exc.value.status_code == 401


def test_delegated_scope_dependency_checks_token_grant_and_current_user(
    test_user, db
) -> None:
    token = AuthService.create_delegated_access_token(test_user, ["profile:read"])
    dependency = require_scopes("profile:read")
    principal = dependency(
        credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
        db=db,
    )

    assert principal.user.id == test_user.id
    assert principal.scopes == {"profile:read"}

    with pytest.raises(HTTPException) as exc:
        require_scopes("profile:write")(
            credentials=HTTPAuthorizationCredentials(
                scheme="Bearer",
                credentials=token,
            ),
            db=db,
        )

    assert exc.value.status_code == 403


def test_personal_access_token_can_use_delegated_scope_dependency(test_user, db) -> None:
    created = PersonalAccessTokenService.create(
        db,
        test_user,
        name="scoped-client",
        scopes=["profile:read"],
    )
    dependency = require_scopes("profile:read")
    principal = dependency(
        credentials=HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=str(created["token"]),
        ),
        db=db,
    )

    assert principal.user.id == test_user.id
    assert principal.scopes == {"profile:read"}
    assert principal.credential_id == created["id"]



def test_browser_user_dependency_rejects_delegated_access_token(test_user, db) -> None:
    token = AuthService.create_delegated_access_token(test_user, ["profile:read"])
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as required:
        get_current_user(credentials=credentials, db=db)
    assert required.value.status_code == 401

    with pytest.raises(HTTPException) as optional:
        get_current_user_optional(credentials=credentials, db=db)
    assert optional.value.status_code == 401


def test_browser_user_dependency_accepts_browser_access_token(test_user, db) -> None:
    token = AuthService.create_access_token({"sub": test_user.id, "email": test_user.email})
    user = get_current_user(
        credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
        db=db,
    )
    assert user.id == test_user.id
