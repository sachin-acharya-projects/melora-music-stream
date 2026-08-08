from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class AdminSettingsModel(BaseModel):
    _override_tablename = "admin_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="global")
    project_name: Mapped[str] = mapped_column(String, default="Melora Backend")
    debug: Mapped[bool] = mapped_column(Boolean, default=False)
    cache_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_cache_size_gb: Mapped[int] = mapped_column(Integer, default=10)
    cache_ttl_hours: Mapped[int] = mapped_column(Integer, default=72)
    redis_stream_cache_ttl: Mapped[int] = mapped_column(Integer, default=10800)
    jwt_access_token_expire_minutes: Mapped[int] = mapped_column(Integer, default=1440)
    jwt_refresh_token_expire_days: Mapped[int] = mapped_column(Integer, default=30)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )
