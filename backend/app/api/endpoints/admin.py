from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import SessionDep, require_admin
from app.schemas.admin import AdminSettingsResponse, AdminSettingsUpdate
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
