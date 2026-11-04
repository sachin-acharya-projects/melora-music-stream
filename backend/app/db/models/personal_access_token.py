from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel

if TYPE_CHECKING:
    from datetime import datetime

class PersonalAccessTokenModel(BaseModel):
    """Hashed, user-owned personal access token with an explicit scope grant."""

    _override_tablename = "personal_access_tokens"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    token_prefix: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
