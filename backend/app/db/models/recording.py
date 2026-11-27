from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.recording_identity import RecordingIdentityModel
    from app.db.models.song import SongModel


class RecordingModel(BaseModel):
    """Provider-independent identity for one specific audio recording.

    A recording is distinct from a playable source: multiple YouTube videos or
    provider entries may point to the same recording. Different edits, live
    versions, remixes, and remasters should remain separate recordings.
    """

    title: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_release_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    songs: Mapped[list[SongModel]] = relationship(
        "SongModel", back_populates="recording", lazy="selectin"
    )
    identities: Mapped[list[RecordingIdentityModel]] = relationship(
        "RecordingIdentityModel",
        back_populates="recording",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
