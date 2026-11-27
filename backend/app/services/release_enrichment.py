"""Database-backed queue for automatic canonical release enrichment."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.release import ReleaseModel
from app.db.models.release_enrichment_job import ReleaseEnrichmentJobModel
from app.db.models.release_identity import ReleaseIdentityModel
from app.services.releases import ReleaseService

logger = logging.getLogger(__name__)


class ReleaseEnrichmentQueue:
    """Idempotent enqueue/claim/retry operations for release tracklists."""

    @staticmethod
    def enqueue_candidates(db: Session, *, limit: int = 100) -> int:
        # Exclude releases that already have a job in SQL, rather than
        # repeatedly scanning the newest N releases and starving older rows.
        releases = (
            db.query(ReleaseModel)
            .outerjoin(
                ReleaseEnrichmentJobModel,
                ReleaseEnrichmentJobModel.release_id == ReleaseModel.id,
            )
            .filter(ReleaseEnrichmentJobModel.id.is_(None))
            .order_by(ReleaseModel.updated_at.desc())
            .limit(limit)
            .all()
        )
        queued = 0
        now = datetime.now(UTC).replace(tzinfo=None)
        for release in releases:
            # A MusicBrainz release identity plus a populated tracklist is the
            # durable success marker; no more provider lookup is needed.
            if release.tracks and any(
                identity.provider == "musicbrainz"
                and identity.identity_type == "release_id"
                for identity in release.identities
            ):
                continue
            try:
                with db.begin_nested():
                    db.add(
                        ReleaseEnrichmentJobModel(
                            release_id=release.id,
                            status="pending",
                            attempts=0,
                            available_at=now,
                        )
                    )
                    db.flush()
                queued += 1
            except IntegrityError:
                # Another application instance may have queued this release.
                continue
        if queued:
            db.commit()
        return queued

    @staticmethod
    def process_one(db: Session) -> bool:
        now = datetime.now(UTC).replace(tzinfo=None)
        stale_before = now - timedelta(minutes=15)
        db.execute(
            update(ReleaseEnrichmentJobModel)
            .where(
                ReleaseEnrichmentJobModel.status == "processing",
                ReleaseEnrichmentJobModel.locked_at < stale_before,
            )
            .values(status="pending", locked_at=None, available_at=now)
        )
        db.commit()

        job = (
            db.query(ReleaseEnrichmentJobModel)
            .filter(
                ReleaseEnrichmentJobModel.status == "pending",
                ReleaseEnrichmentJobModel.available_at <= now,
            )
            .order_by(
                ReleaseEnrichmentJobModel.available_at,
                ReleaseEnrichmentJobModel.created_at,
            )
            .first()
        )
        if job is None:
            return False

        claimed = db.execute(
            update(ReleaseEnrichmentJobModel)
            .where(
                ReleaseEnrichmentJobModel.id == job.id,
                ReleaseEnrichmentJobModel.status == "pending",
            )
            .values(status="processing", locked_at=now)
        )
        if claimed.rowcount != 1:
            db.rollback()
            return True

        job_id = job.id
        release_id = job.release_id
        attempts = job.attempts + 1
        db.commit()

        job = db.get(ReleaseEnrichmentJobModel, job_id)
        release = db.get(ReleaseModel, release_id)
        if job is None:
            return True
        if release is None:
            db.delete(job)
            db.commit()
            return True

        try:
            track_count = ReleaseService.enrich_release_from_musicbrainz(
                db,
                release,
                minimum_score=settings.MUSICBRAINZ_MIN_MATCH_SCORE,
            )
            job = db.get(ReleaseEnrichmentJobModel, job_id)
            if job is None:
                return True
            job.attempts = attempts
            job.locked_at = None
            if track_count > 0:
                job.status = "completed"
                job.last_error = None
            else:
                # A clean miss or ambiguous match is not a transient failure.
                # Recheck periodically as MusicBrainz coverage can improve.
                job.status = "pending"
                job.available_at = now + timedelta(days=30)
                job.last_error = "No unambiguous MusicBrainz release with a tracklist"
            db.commit()
        except Exception as exc:
            db.rollback()
            job = db.get(ReleaseEnrichmentJobModel, job_id)
            if job is None:
                return True
            job.attempts = attempts
            job.locked_at = None
            job.last_error = str(exc)[:1000]
            if attempts >= settings.RELEASE_ENRICHMENT_MAX_ATTEMPTS:
                job.status = "failed"
            else:
                job.status = "pending"
                delay = min(
                    settings.RELEASE_ENRICHMENT_RETRY_MAX_SECONDS,
                    settings.RELEASE_ENRICHMENT_RETRY_BASE_SECONDS * (2 ** (attempts - 1)),
                )
                job.available_at = now + timedelta(seconds=delay)
            db.commit()
            logger.warning(
                "Release enrichment failed for release %s", release_id, exc_info=True
            )
        return True


release_enrichment_queue = ReleaseEnrichmentQueue()
