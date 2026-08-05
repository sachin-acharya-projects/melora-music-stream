from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import SessionDep, require_admin
from app.core.config import settings
from app.db.models.admin_settings import AdminSettingsModel
from app.schemas.admin import AdminSettingsResponse, AdminSettingsUpdate

router = APIRouter()


@router.get("/settings")
async def get_admin_settings(
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> AdminSettingsResponse:
    """Get current application settings."""
    row = db.query(AdminSettingsModel).filter(AdminSettingsModel.id == "global").first()
    if not row:
        return AdminSettingsResponse(
            project_name=settings.PROJECT_NAME,
            debug=settings.DEBUG,
            cache_enabled=settings.CACHE_ENABLED,
            max_cache_size_gb=settings.MAX_CACHE_SIZE_GB,
            cache_ttl_hours=settings.CACHE_TTL_HOURS,
            redis_stream_cache_ttl=settings.REDIS_STREAM_CACHE_TTL,
            jwt_access_token_expire_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
            jwt_refresh_token_expire_days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
            frontend_url=settings.FRONTEND_URL,
            oauth_configured=bool(
                settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET
            ),
        )

    return AdminSettingsResponse(
        project_name=row.project_name,
        debug=row.debug,
        cache_enabled=row.cache_enabled,
        max_cache_size_gb=row.max_cache_size_gb,
        cache_ttl_hours=row.cache_ttl_hours,
        redis_stream_cache_ttl=row.redis_stream_cache_ttl,
        jwt_access_token_expire_minutes=row.jwt_access_token_expire_minutes,
        jwt_refresh_token_expire_days=row.jwt_refresh_token_expire_days,
        frontend_url=settings.FRONTEND_URL,
        oauth_configured=bool(
            settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET
        ),
        updated_at=row.updated_at,
    )


@router.patch("/settings")
async def update_admin_settings(
    update: AdminSettingsUpdate,
    db: SessionDep,
    _: Annotated[None, Depends(require_admin)],
) -> AdminSettingsResponse:
    """Update application settings."""
    row = db.query(AdminSettingsModel).filter(AdminSettingsModel.id == "global").first()
    if not row:
        row = AdminSettingsModel(id="global")
        db.add(row)

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(row, field, value)

    db.commit()
    db.refresh(row)

    return AdminSettingsResponse(
        project_name=row.project_name,
        debug=row.debug,
        cache_enabled=row.cache_enabled,
        max_cache_size_gb=row.max_cache_size_gb,
        cache_ttl_hours=row.cache_ttl_hours,
        redis_stream_cache_ttl=row.redis_stream_cache_ttl,
        jwt_access_token_expire_minutes=row.jwt_access_token_expire_minutes,
        jwt_refresh_token_expire_days=row.jwt_refresh_token_expire_days,
        frontend_url=settings.FRONTEND_URL,
        oauth_configured=bool(
            settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET
        ),
        updated_at=row.updated_at,
    )
