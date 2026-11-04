from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class MachineClientModel(BaseModel):
    """Independent machine identity with its own credentials and scope ceiling."""

    _override_tablename = "machine_clients"

    owner_user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_identity: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    client_secret_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)


class MachineUserGrantModel(BaseModel):
    """Explicit machine-client authorization to act within one user's data boundary."""

    _override_tablename = "machine_user_grants"
    __table_args__ = (
        UniqueConstraint(
            "machine_client_id",
            "user_id",
            name="uq_machine_user_grant_client_user",
        ),
    )

    machine_client_id: Mapped[str] = mapped_column(
        String, ForeignKey("machine_clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
