from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, SessionDep, require_admin
from app.schemas.admin import (
    AdminDashboardResponse,
    AdminSettingsResponse,
    AdminSettingsUpdate,
    ArtistUpdate,
    BatchArtistImportRequest,
    PlaylistImportRequest,
    SongImportRequest,
    SongUpdate,
    UserAdminUpdate,
)
from app.services.admin import AdminService
from app.services.admin_settings import AdminSettingsService

router = APIRouter()


@router.get("/settings")
async def get_admin_settings(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> AdminSettingsResponse:
    """Get current application settings."""
    return AdminSettingsService.get_settings(db)


@router.patch("/settings")
async def update_admin_settings(
    update: AdminSettingsUpdate,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> AdminSettingsResponse:
    """Update application settings."""
    return AdminSettingsService.update_settings(db, update)


@router.get("/dashboard")
async def get_dashboard(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> AdminDashboardResponse:
    """Global catalog and activity metrics for the admin dashboard."""
    return AdminDashboardResponse(**AdminService.dashboard(db))


# ------------------------------------------------------------------ #
# Artists
# ------------------------------------------------------------------ #
@router.get("/artists")
def list_artists(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
    search: Annotated[str | None, Query(max_length=100)] = None,
    sort_by: Annotated[
        str,
        Query(
            pattern="^(name|follower_count|monthly_listeners|created_at|plays)$"
        ),
    ] = "created_at",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
    source: Annotated[str | None, Query(pattern="^(youtube|platform)$")] = None,
    published: Annotated[bool | None, Query()] = None,
) -> dict[str, Any]:
    """All artists in the catalog, including hidden ones."""
    return AdminService.list_artists(
        db,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
        source=source,
        published=published,
    )


@router.patch("/artists/{artist_id}")
def update_artist(
    artist_id: str,
    update: ArtistUpdate,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Edit artist metadata."""
    return AdminService.update_artist(db, artist_id, update)


@router.post("/artists/{artist_id}/feature")
def feature_artist(
    artist_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Mark an artist as featured."""
    return AdminService.set_artist_featured(db, artist_id, featured=True)


@router.post("/artists/{artist_id}/unfeature")
def unfeature_artist(
    artist_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Remove the featured mark from an artist."""
    return AdminService.set_artist_featured(db, artist_id, featured=False)


@router.post("/artists/{artist_id}/publish")
def publish_artist(
    artist_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Publish an artist to the user-facing catalog."""
    return AdminService.set_artist_published(db, artist_id, published=True)


@router.post("/artists/{artist_id}/hide")
def hide_artist(
    artist_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Hide an artist from the user-facing catalog."""
    return AdminService.set_artist_published(db, artist_id, published=False)


@router.delete("/artists/{artist_id}")
def delete_artist(
    artist_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Delete an artist and its releases/relations."""
    return AdminService.delete_artist(db, artist_id)


@router.post("/artists/batch-import")
def batch_import_artists(
    data: BatchArtistImportRequest,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Import several artists at once from names, channel ids, or URLs."""
    results = AdminService.batch_import_artists(data.items, thumbnail=data.thumbnail)
    return {
        "total": len(results),
        "imported": sum(1 for r in results if r["status"] == "imported"),
        "already_exists": sum(1 for r in results if r["status"] == "already_exists"),
        "failed": sum(1 for r in results if r["status"] == "failed"),
        "items": results,
    }


# ------------------------------------------------------------------ #
# Songs
# ------------------------------------------------------------------ #
@router.get("/songs")
def list_songs(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
    search: Annotated[str | None, Query(max_length=100)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
    published: Annotated[bool | None, Query()] = None,
) -> dict[str, Any]:
    """All songs in the catalog, including hidden ones."""
    return AdminService.list_songs(
        db, search=search, page=page, page_size=page_size, published=published
    )


@router.post("/songs/import")
def import_song(
    data: SongImportRequest,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Import a song into the catalog from a YouTube id or URL."""
    return AdminService.import_song(db, data)


@router.patch("/songs/{song_id}")
def update_song(
    song_id: str,
    update: SongUpdate,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Edit song metadata."""
    return AdminService.update_song(db, song_id, update)


@router.post("/songs/{song_id}/feature")
def feature_song(
    song_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Mark a song as featured."""
    return AdminService.set_song_featured(db, song_id, featured=True)


@router.post("/songs/{song_id}/unfeature")
def unfeature_song(
    song_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Remove the featured mark from a song."""
    return AdminService.set_song_featured(db, song_id, featured=False)


@router.post("/songs/{song_id}/publish")
def publish_song(
    song_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Publish a song to the user-facing catalog."""
    return AdminService.set_song_published(db, song_id, published=True)


@router.post("/songs/{song_id}/hide")
def hide_song(
    song_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Hide a song from the user-facing catalog."""
    return AdminService.set_song_published(db, song_id, published=False)


@router.delete("/songs/{song_id}")
def delete_song(
    song_id: str,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Delete a song from the catalog."""
    return AdminService.delete_song(db, song_id)


# ------------------------------------------------------------------ #
# Playlist -> catalog import
# ------------------------------------------------------------------ #
@router.post("/playlists/import")
def import_playlist(
    data: PlaylistImportRequest,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Import every song from a YouTube playlist into the catalog."""
    return AdminService.import_playlist(db, data)


# ------------------------------------------------------------------ #
# Users
# ------------------------------------------------------------------ #
@router.get("/users")
def list_users(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
    search: Annotated[str | None, Query(max_length=100)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 50,
) -> dict[str, Any]:
    """All registered users."""
    return AdminService.list_users(
        db, search=search, page=page, page_size=page_size
    )


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    update: UserAdminUpdate,
    db: SessionDep,
    acting_user: CurrentUser,
    _: Annotated[None, Depends(require_admin)],
) -> dict[str, Any]:
    """Update a user's role or active state."""
    return AdminService.update_user(
        db, user_id, update, acting_user=acting_user
    )
