from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.admin_settings import AdminSettingsModel
from app.schemas.admin import AdminSettingsResponse, AdminSettingsUpdate

_ROW_ID = "global"


class AdminSettingsService:
    """Read and update runtime-overridable application settings."""

    @staticmethod
    def _to_response(row: AdminSettingsModel | None) -> AdminSettingsResponse:
        return AdminSettingsResponse(
            project_name=row.project_name if row else settings.PROJECT_NAME,
            debug=row.debug if row else settings.DEBUG,
            cache_enabled=row.cache_enabled if row else settings.CACHE_ENABLED,
            max_cache_size_gb=row.max_cache_size_gb
            if row
            else settings.MAX_CACHE_SIZE_GB,
            cache_ttl_hours=row.cache_ttl_hours if row else settings.CACHE_TTL_HOURS,
            redis_stream_cache_ttl=(
                row.redis_stream_cache_ttl if row else settings.REDIS_STREAM_CACHE_TTL
            ),
            jwt_access_token_expire_minutes=(
                row.jwt_access_token_expire_minutes
                if row
                else settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
            ),
            jwt_refresh_token_expire_days=(
                row.jwt_refresh_token_expire_days
                if row
                else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
            ),
            frontend_url=settings.FRONTEND_URL,
            oauth_configured=bool(
                settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET
            ),
            updated_at=row.updated_at if row else None,
        )

    @staticmethod
    def get_settings(db: Session) -> AdminSettingsResponse:
        """Get the current settings, falling back to config defaults."""
        row = (
            db.query(AdminSettingsModel)
            .filter(AdminSettingsModel.id == _ROW_ID)
            .first()
        )
        return AdminSettingsService._to_response(row)

    @staticmethod
    def update_settings(
        db: Session, update: AdminSettingsUpdate
    ) -> AdminSettingsResponse:
        """Apply a partial settings update, creating the override row on first write."""
        row = (
            db.query(AdminSettingsModel)
            .filter(AdminSettingsModel.id == _ROW_ID)
            .first()
        )
        if row is None:
            row = AdminSettingsModel(id=_ROW_ID)
            db.add(row)

        for field, value in update.model_dump(exclude_unset=True).items():
            setattr(row, field, value)

        db.commit()
        db.refresh(row)
        return AdminSettingsService._to_response(row)
