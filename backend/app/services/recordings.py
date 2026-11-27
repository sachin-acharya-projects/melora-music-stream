"""Canonical recording identity helpers.

SongModel remains the playable-source record (currently keyed by YouTube video
ID). RecordingModel represents the underlying recording and can be shared by
multiple playable sources after a confident metadata match.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models.recording import RecordingModel
from app.db.models.recording_identity import RecordingIdentityModel
from app.db.models.song import SongModel


class RecordingIdentityConflict(ValueError):
    """Raised when an external identity is already assigned elsewhere."""


class RecordingService:
    @staticmethod
    def ensure_recording_for_song(
        db: Session,
        song: SongModel,
    ) -> RecordingModel:
        """Return the song's recording, creating a provisional one if needed."""
        if song.recording is not None:
            return song.recording

        recording = RecordingModel(
            title=song.title,
            duration=song.duration,
            metadata={"identity_status": "provisional"},
        )
        db.add(recording)
        db.flush()
        song.recording = recording
        db.flush()
        return recording

    @staticmethod
    def add_identity(
        db: Session,
        *,
        recording: RecordingModel,
        provider: str,
        identity_type: str,
        external_id: str,
        provider_metadata: dict[str, Any] | None = None,
    ) -> RecordingIdentityModel:
        """Attach an external ID without merging or reassigning recordings."""
        normalized_provider = provider.strip().lower()
        normalized_type = identity_type.strip().lower()
        normalized_external_id = external_id.strip()
        if not normalized_provider or not normalized_type or not normalized_external_id:
            raise ValueError("provider, identity_type, and external_id are required")

        existing = (
            db.query(RecordingIdentityModel)
            .filter(
                RecordingIdentityModel.provider == normalized_provider,
                RecordingIdentityModel.identity_type == normalized_type,
                RecordingIdentityModel.external_id == normalized_external_id,
            )
            .one_or_none()
        )
        if existing is not None:
            if existing.recording_id != recording.id:
                raise RecordingIdentityConflict(
                    "This external recording identity is already linked to "
                    "a different Melora recording."
                )
            if provider_metadata:
                existing.provider_metadata = provider_metadata
            return existing

        identity = RecordingIdentityModel(
            recording_id=recording.id,
            provider=normalized_provider,
            identity_type=normalized_type,
            external_id=normalized_external_id,
            provider_metadata=provider_metadata,
        )
        db.add(identity)
        db.flush()
        return identity


recording_service = RecordingService()
