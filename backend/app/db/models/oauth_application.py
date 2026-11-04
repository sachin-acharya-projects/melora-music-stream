from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel

class OAuthApplicationModel(BaseModel):
    """User-registered OAuth client with hashed secret and bounded scope ceiling."""

    _override_tablename = "oauth_applications"

    owner_user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    client_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    client_secret_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    redirect_uris: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    allowed_scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    is_confidential: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
