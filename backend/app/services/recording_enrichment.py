"""Database-backed background processing for canonical recording metadata."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, or_, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.recording_enrichment_job import RecordingEnrichmentJobModel
from app.db.models.recording_identity import RecordingIdentityModel
from app.db.models.song import SongModel
from app.services.recordings import RecordingService

logger = logging.getLogger(__name__)


class RecordingEnrichmentQueue:
    """Idempotent enqueue/claim/retry operations for recording enrichment."""

    @staticmethod
    def enqueue_candidates(db: Session, *, limit: int = 100) -> int:
        songs = (
            db.query(SongModel)
            .filter(SongModel.recording_id.is_not(None), SongModel.artists.any())
            .order_by(SongModel.updated_at.desc())
            .limit(limit)
            .all()
        )
        queued = 0
        now = datetime.now(UTC).replace(tzinfo=None)
        for song in songs:
            verified = (
                db.query(RecordingIdentityModel.id)
                .filter(
                    RecordingIdentityModel.recording_id == song.recording_id,
                    RecordingIdentityModel.provider == "musicbrainz",
                    RecordingIdentityModel.identity_type == "recording_id",
                )
                .first()
            )
            if verified:
                continue
            existing = (
                db.query(RecordingEnrichmentJobModel.id)
                .filter(RecordingEnrichmentJobModel.song_id == song.id)
                .first()
            )
            if existing:
                continue
            db.add(
                RecordingEnrichmentJobModel(
                    song_id=song.id,
                    status="pending",
                    attempts=0,
                    available_at=now,
                )
            )
            queued += 1
        if queued:
            db.commit()
        return queued

    @staticmethod
    def process_one(db: Session) -> bool:
        now = datetime.now(UTC).replace(tzinfo=None)
        job = (
            db.query(RecordingEnrichmentJobModel)
            .filter(
                RecordingEnrichmentJobModel.status == "pending",
                RecordingEnrichmentJobModel.available_at <= now,
            )
            .order_by(RecordingEnrichmentJobModel.available_at, RecordingEnrichmentJobModel.created_at)
            .first()
        )
        if job is None:
            return False

        # Conditional update makes claiming safe across multiple app instances.
        claimed = db.execute(
            update(RecordingEnrichmentJobModel)
            .where(
                RecordingEnrichmentJobModel.id == job.id,
                RecordingEnrichmentJobModel.status == "pending",
            )
            .values(status="processing", locked_at=now)
        )
        if claimed.rowcount != 1:
            db.rollback()
            return True
        song_id = job.song_id
        attempts = job.attempts + 1
        db.commit()

        job = db.get(RecordingEnrichmentJobModel, job.id)
        song = db.get(SongModel, song_id)
        if job is None:
            return True
        if song is None:
            db.delete(job)
            db.commit()
            return True

        try:
            recording = RecordingService.enrich_song_from_musicbrainz(
                db,
                song,
                minimum_score=settings.MUSICBRAINZ_MIN_MATCH_SCORE,
                duration_tolerance_seconds=settings.MUSICBRAINZ_DURATION_TOLERANCE_SECONDS,
            )
            if recording is not None:
                job.status = "completed"
                job.last_error = None
                job.locked_at = None
                db.commit()
            else:
                # A clean no-match is not a transient failure. Keep it pending
                # for a slow recheck because MusicBrainz coverage can improve.
                job.status = "pending"
                job.attempts = attempts
                job.locked_at = None
                job.available_at = now + timedelta(days=30)
                job.last_error = "No unambiguous MusicBrainz match"
                db.commit()
        except Exception as exc:
            db.rollback()
            job = db.get(RecordingEnrichmentJobModel, job.id)
            if job is None:
                return True
            job.attempts = attempts
            job.locked_at = None
            job.last_error = str(exc)[:1000]
            if attempts >= settings.RECORDING_ENRICHMENT_MAX_ATTEMPTS:
                job.status = "failed"
            else:
                job.status = "pending"
                delay = min(
                    settings.RECORDING_ENRICHMENT_RETRY_MAX_SECONDS,
                    settings.RECORDING_ENRICHMENT_RETRY_BASE_SECONDS * (2 ** (attempts - 1)),
                )
                job.available_at = now + timedelta(seconds=delay)
            db.commit()
            logger.warning("Recording enrichment failed for song %s", song_id, exc_info=True)
        return True


recording_enrichment_queue = RecordingEnrichmentQueue()
