from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class RecordingEnrichmentJobModel(BaseModel):
    """Durable, retryable queue for background recording metadata enrichment."""

    __tablename__ = "recording_enrichment_jobs"

    song_id: Mapped[str] = mapped_column(
        String, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("song_id", name="uq_recording_enrichment_job_song"),
        Index("ix_recording_enrichment_jobs_status_available", "status", "available_at"),
    )
