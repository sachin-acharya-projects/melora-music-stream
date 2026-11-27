from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.release import ReleaseModel


class ReleaseIdentityModel(BaseModel):
    """Maps a Melora release to an identifier from an external provider.

    Identity types distinguish different IDs issued by the same provider,
    such as a YouTube Music album browse ID and its audio playlist ID.
    Provider/external ID is intentionally indexed but not globally unique yet:
    legacy data may contain duplicate release rows for one upstream release.
    Those duplicates will be reconciled in a later catalogue migration.
    """

    __tablename__ = "release_identities"

    release_id: Mapped[str] = mapped_column(
        String, ForeignKey("releases.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    identity_type: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    provider_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON, nullable=True
    )

    release: Mapped[ReleaseModel] = relationship(
        "ReleaseModel", back_populates="identities", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint(
            "release_id",
            "provider",
            "identity_type",
            "external_id",
            name="uq_release_identity_release_provider_type_external",
        ),
        Index(
            "ix_release_identities_provider_lookup",
            "provider",
            "identity_type",
            "external_id",
        ),
        Index("ix_release_identities_release_id", "release_id"),
    )
