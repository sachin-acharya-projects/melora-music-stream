from __future__ import annotations

from sqlalchemy import Boolean, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class OIDCProviderModel(BaseModel):
    """Administrator-managed OpenID Connect provider configuration."""

    _override_tablename = "oidc_providers"

    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    issuer: Mapped[str] = mapped_column(String(2048), unique=True, index=True)
    discovery_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    client_id: Mapped[str] = mapped_column(String(1024))
    # Ciphertext only. Encryption/decryption is handled by the identity service;
    # plaintext client secrets must never be persisted.
    client_secret_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=lambda: ["openid", "email", "profile"])
    display_name: Mapped[str] = mapped_column(String(120))
    button_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_provision: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
