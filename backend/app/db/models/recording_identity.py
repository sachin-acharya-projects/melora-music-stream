from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.recording import RecordingModel


class RecordingIdentityModel(BaseModel):
    """An external identifier for a canonical recording.

    Provider IDs (for example MusicBrainz recording MBIDs) and standardized
    identifiers (ISRCs) are kept separate from Melora's recording ID and from
    playable SongModel IDs.
    """

    __tablename__ = "recording_identities"

    recording_id: Mapped[str] = mapped_column(
        String, ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String, nullable=False)
    identity_type: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    provider_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON, nullable=True
    )

    recording: Mapped[RecordingModel] = relationship(
        "RecordingModel", back_populates="identities", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "identity_type",
            "external_id",
            name="uq_recording_identity_provider_type_external",
        ),
        Index(
            "ix_recording_identities_recording_id",
            "recording_id",
        ),
    )
