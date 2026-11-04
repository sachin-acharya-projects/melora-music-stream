import pytest
from fastapi import HTTPException

from app.core.scopes import ALL_SCOPES, ADMIN_SCOPES, normalize_scopes
from app.services.authorization import (
    effective_scope_ceiling,
    require_delegated_scopes,
    validate_scope_grant,
)


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
