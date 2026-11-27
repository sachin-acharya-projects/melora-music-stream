from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.artist import ArtistModel


class ArtistIdentityModel(BaseModel):
    __tablename__ = "artist_identities"

    """A provider-specific identity attached to a Melora canonical artist.

    ArtistModel.id remains Melora's stable internal identifier. Provider IDs
    are mapped separately so multiple sources can refer to one artist.
    """

    artist_id: Mapped[str] = mapped_column(
        String, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    provider_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    artist: Mapped[ArtistModel] = relationship(
        "ArtistModel", back_populates="identities", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint(
            "provider", "external_id", name="uq_artist_identity_provider_external"
        ),
        Index("ix_artist_identities_artist_provider", "artist_id", "provider"),
    )
