"""Canonical OAuth/API scope catalog and scope validation helpers."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ScopeDefinition:
    name: str
    description: str
    category: str
    sensitive: bool = False
    admin_only: bool = False


_SCOPE_DEFINITIONS = (
    ScopeDefinition("profile:read", "Read the authorized user's profile", "profile"),
    ScopeDefinition("profile:write", "Update the authorized user's profile", "profile"),
    ScopeDefinition("library:read", "Read the authorized user's music library", "library"),
    ScopeDefinition("library:write", "Modify the authorized user's music library", "library"),
    ScopeDefinition("songs:read", "Read song metadata and saved songs", "catalog"),
    ScopeDefinition("songs:write", "Save, remove, and organize songs", "catalog"),
    ScopeDefinition("albums:read", "Read album metadata and saved albums", "catalog"),
    ScopeDefinition("albums:write", "Save and remove albums", "catalog"),
    ScopeDefinition("artists:read", "Read artist metadata and followed artists", "catalog"),
    ScopeDefinition("artists:write", "Follow and unfollow artists", "catalog"),
    ScopeDefinition("playlists:read", "Read playlists the user can access", "playlists"),
    ScopeDefinition("playlists:write", "Create and modify playlists the user can edit", "playlists"),
    ScopeDefinition("history:read", "Read the user's listening history", "activity", sensitive=True),
    ScopeDefinition("history:write", "Record listening activity for the user", "activity"),
    ScopeDefinition("player:read", "Read playback state", "playback"),
    ScopeDefinition("player:control", "Control playback for the user", "playback", sensitive=True),
    ScopeDefinition("uploads:create", "Upload or import music into the user's library", "uploads", sensitive=True),
    ScopeDefinition("settings:read", "Read the user's settings", "settings"),
    ScopeDefinition("settings:write", "Modify the user's settings", "settings", sensitive=True),
    ScopeDefinition("admin:users:read", "Read user administration data", "admin", sensitive=True, admin_only=True),
    ScopeDefinition("admin:users:write", "Manage user accounts and roles", "admin", sensitive=True, admin_only=True),
    ScopeDefinition("admin:catalog:write", "Manage the shared music catalog", "admin", sensitive=True, admin_only=True),
    ScopeDefinition("admin:settings:write", "Change server-wide settings", "admin", sensitive=True, admin_only=True),
    ScopeDefinition("automation:run", "Trigger approved Melora automations", "automation", sensitive=True),
    ScopeDefinition("webhooks:manage", "Manage webhook subscriptions and secrets", "developer", sensitive=True),
)

SCOPE_CATALOG: dict[str, ScopeDefinition] = {
    definition.name: definition for definition in _SCOPE_DEFINITIONS
}
ALL_SCOPES = frozenset(SCOPE_CATALOG)
ADMIN_SCOPES = frozenset(
    name for name, definition in SCOPE_CATALOG.items() if definition.admin_only
)
SENSITIVE_SCOPES = frozenset(
    name for name, definition in SCOPE_CATALOG.items() if definition.sensitive
)


class UnknownScopeError(ValueError):
    """Raised when an API client requests a scope Melora does not recognize."""


def normalize_scopes(scopes: list[str] | tuple[str, ...] | set[str]) -> frozenset[str]:
    """Validate and normalize scope names without silently accepting unknown values."""
    normalized = frozenset(scope.strip() for scope in scopes if scope.strip())
    unknown = normalized - ALL_SCOPES
    if unknown:
        raise UnknownScopeError(f"Unknown scope(s): {', '.join(sorted(unknown))}")
    return normalized


def scopes_within_ceiling(
    requested: list[str] | tuple[str, ...] | set[str],
    ceiling: list[str] | tuple[str, ...] | set[str],
) -> bool:
    """Return whether requested scopes are a subset of the registering user's ceiling."""
    return normalize_scopes(requested).issubset(normalize_scopes(ceiling))


def serialize_scope_catalog() -> list[dict[str, str | bool]]:
    """Return stable, UI-friendly scope metadata."""
    return [
        {
            "name": item.name,
            "description": item.description,
            "category": item.category,
            "sensitive": item.sensitive,
            "admin_only": item.admin_only,
        }
        for item in _SCOPE_DEFINITIONS
    ]
