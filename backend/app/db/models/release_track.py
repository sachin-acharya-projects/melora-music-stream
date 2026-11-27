from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.recording import RecordingModel
    from app.db.models.release import ReleaseModel
    from app.db.models.song import SongModel


class ReleaseTrackModel(BaseModel):
    """A track position on a particular release, linked to its recording.

    The same recording may appear on multiple releases. Track rows therefore
    belong to releases, not directly to recordings, and can optionally point
    to a playable source song already known to Melora.
    """

    release_id: Mapped[str] = mapped_column(
        String, ForeignKey("releases.id", ondelete="CASCADE"), nullable=False
    )
    recording_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("recordings.id", ondelete="SET NULL"), nullable=True
    )
    source_song_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("songs.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    musicbrainz_track_id: Mapped[str | None] = mapped_column(String, nullable=True)
    musicbrainz_recording_id: Mapped[str | None] = mapped_column(String, nullable=True)

    release: Mapped[ReleaseModel] = relationship("ReleaseModel", back_populates="tracks")
    recording: Mapped[RecordingModel | None] = relationship(
        "RecordingModel", back_populates="release_tracks", lazy="selectin"
    )
    source_song: Mapped[SongModel | None] = relationship("SongModel", lazy="selectin")

    __table_args__ = (
        UniqueConstraint(
            "release_id", "disc_number", "position",
            name="uq_release_track_disc_position",
        ),
        Index("ix_release_tracks_recording_id", "recording_id"),
        Index("ix_release_tracks_source_song_id", "source_song_id"),
        Index("ix_release_tracks_musicbrainz_recording_id", "musicbrainz_recording_id"),
    )
