"""Canonical recording identity helpers.

SongModel remains the playable-source record (currently keyed by YouTube video
ID). RecordingModel represents the underlying recording and can be shared by
multiple playable sources after a confident metadata match.
"""

from __future__ import annotations

import logging
import re
import threading
import time
import unicodedata
from collections import OrderedDict
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.db.models.recording import RecordingModel
from app.db.models.recording_identity import RecordingIdentityModel
from app.db.models.release_track import ReleaseTrackModel
from app.db.models.song import SongModel

logger = logging.getLogger(__name__)
MUSICBRAINZ_RECORDING_API = "https://musicbrainz.org/ws/2/recording"
MUSICBRAINZ_HEADERS = {
    "User-Agent": "MeloraMusicStream/1.0 (https://github.com/sachin-acharya-projects/melora-music-stream)"
}
# MusicBrainz asks clients to stay at or below one request per second.
# Both recording and release workers use this same process-wide gate/cache.
_mb_lock = threading.Lock()
_mb_last_request = 0.0
_MB_REQUEST_INTERVAL_SECONDS = 1.05
_MB_MAX_ATTEMPTS = 3
_MB_CACHE_TTL_SECONDS = 24 * 60 * 60
_MB_CACHE_MAX_ENTRIES = 512
_mb_response_cache: OrderedDict[tuple[str, tuple[tuple[str, str], ...]], tuple[float, dict[str, Any]]] = OrderedDict()
_mb_cache_lock = threading.Lock()


def _musicbrainz_retry_delay(response: httpx.Response | None, attempt: int) -> float:
    """Return a bounded retry delay, honoring a valid Retry-After header."""
    if response is not None:
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return min(30.0, max(0.0, float(retry_after)))
            except ValueError:
                try:
                    retry_at = parsedate_to_datetime(retry_after)
                    if retry_at.tzinfo is None:
                        retry_at = retry_at.replace(tzinfo=UTC)
                    return min(30.0, max(0.0, (retry_at - datetime.now(UTC)).total_seconds()))
                except (TypeError, ValueError, OverflowError):
                    pass
    return min(8.0, 1.0 * (2 ** (attempt - 1)))


def _musicbrainz_cache_key(url: str, params: dict[str, str]) -> tuple[str, tuple[tuple[str, str], ...]]:
    return url, tuple(sorted((str(key), str(value)) for key, value in params.items()))


def _normalize_music_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value).casefold()
    plain = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", plain)


def _musicbrainz_get(url: str, params: dict[str, str]) -> dict[str, Any]:
    """Fetch MusicBrainz JSON through a shared, cached, rate-limited client.

    Successful responses are cached for 24 hours. All calls in this process
    (including recording and release enrichment) share the same 1.05s request
    gate. Rate limits and temporary upstream/network failures are retried;
    exhausted failures are raised so database-backed queues can apply durable
    exponential retries.
    """
    global _mb_last_request
    cache_key = _musicbrainz_cache_key(url, params)
    now = time.monotonic()
    with _mb_cache_lock:
        cached = _mb_response_cache.get(cache_key)
        if cached is not None:
            expires_at, payload = cached
            if expires_at > now:
                _mb_response_cache.move_to_end(cache_key)
                return payload
            _mb_response_cache.pop(cache_key, None)

    for attempt in range(1, _MB_MAX_ATTEMPTS + 1):
        with _mb_lock:
            wait = _MB_REQUEST_INTERVAL_SECONDS - (time.monotonic() - _mb_last_request)
            if wait > 0:
                time.sleep(wait)
            _mb_last_request = time.monotonic()

        response: httpx.Response | None = None
        try:
            response = httpx.get(url, params=params, headers=MUSICBRAINZ_HEADERS, timeout=15)
            if response.status_code == 429 or response.status_code in {500, 502, 503, 504}:
                if attempt < _MB_MAX_ATTEMPTS:
                    delay = _musicbrainz_retry_delay(response, attempt)
                    logger.warning(
                        "MusicBrainz returned HTTP %s; retrying in %.1fs (attempt %s/%s)",
                        response.status_code, delay, attempt, _MB_MAX_ATTEMPTS,
                    )
                    time.sleep(delay)
                    continue
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Unexpected MusicBrainz response")

            with _mb_cache_lock:
                _mb_response_cache[cache_key] = (time.monotonic() + _MB_CACHE_TTL_SECONDS, payload)
                _mb_response_cache.move_to_end(cache_key)
                while len(_mb_response_cache) > _MB_CACHE_MAX_ENTRIES:
                    _mb_response_cache.popitem(last=False)
            return payload
        except httpx.RequestError:
            if attempt >= _MB_MAX_ATTEMPTS:
                raise
            delay = _musicbrainz_retry_delay(None, attempt)
            logger.warning(
                "MusicBrainz request failed; retrying in %.1fs (attempt %s/%s)",
                delay, attempt, _MB_MAX_ATTEMPTS, exc_info=True,
            )
            time.sleep(delay)

    raise RuntimeError("MusicBrainz request exhausted retries")


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
            recording_metadata={"identity_status": "provisional"},
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


    @staticmethod
    def enrich_song_from_musicbrainz(
        db: Session,
        song: SongModel,
        *,
        minimum_score: int = 95,
        duration_tolerance_seconds: int = 5,
    ) -> RecordingModel | None:
        """Attach MusicBrainz/ISRC identities only after a strict metadata match.

        Requires linked artist credits; uploader/channel names are not treated
        as artist credits. This method never merges existing recordings.
        """
        # A stored MusicBrainz identity is the durable cache; avoid repeating
        # upstream requests on subsequent worker cycles.
        if song.recording is not None:
            existing_mb = (
                db.query(RecordingIdentityModel)
                .filter(
                    RecordingIdentityModel.recording_id == song.recording.id,
                    RecordingIdentityModel.provider == "musicbrainz",
                    RecordingIdentityModel.identity_type == "recording_id",
                )
                .first()
            )
            if existing_mb is not None:
                return song.recording

        artist_names = [artist.name for artist in song.artists if artist.name]
        if not song.title or not artist_names:
            return None

        escaped_title = song.title.replace('"', '\\"')
        artist_clauses = [
            'artist:"' + name.replace('"', '\\"') + '"'
            for name in artist_names
        ]
        query = 'recording:"' + escaped_title + '" AND ' + " AND ".join(artist_clauses)
        result = _musicbrainz_get(
            MUSICBRAINZ_RECORDING_API,
            {"query": query, "fmt": "json", "limit": "10"},
        )

        expected_title = _normalize_music_text(song.title)
        expected_artists = {_normalize_music_text(name) for name in artist_names}
        matches: list[dict[str, Any]] = []
        for item in result.get("recordings", []):
            if not isinstance(item, dict) or not item.get("id"):
                continue
            if int(item.get("score") or 0) < minimum_score:
                continue
            if _normalize_music_text(str(item.get("title") or "")) != expected_title:
                continue
            credits = item.get("artist-credit") or []
            credit_names = {
                _normalize_music_text(
                    str(credit.get("name") or (credit.get("artist") or {}).get("name") or "")
                )
                for credit in credits
                if isinstance(credit, dict)
            }
            if not expected_artists.issubset(credit_names):
                continue
            remote_length = item.get("length")
            if song.duration and remote_length:
                if abs(int(remote_length) / 1000 - song.duration) > duration_tolerance_seconds:
                    continue
            matches.append(item)

        if len(matches) != 1:
            logger.info(
                "MusicBrainz recording unresolved for song %s (%d strict matches)",
                song.id,
                len(matches),
            )
            return None

        candidate = matches[0]
        detail = _musicbrainz_get(
            f"{MUSICBRAINZ_RECORDING_API}/{candidate['id']}",
            {"fmt": "json", "inc": "isrcs+artists"},
        )

        recording = RecordingService.ensure_recording_for_song(db, song)
        try:
            RecordingService.add_identity(
                db,
                recording=recording,
                provider="musicbrainz",
                identity_type="recording_id",
                external_id=str(candidate["id"]),
                provider_metadata={"score": candidate.get("score")},
            )
        except RecordingIdentityConflict:
            logger.warning("MusicBrainz recording ID already belongs to another recording")
            return None

        # Reconcile release tracks using the persisted provider ID, never title.
        db.query(ReleaseTrackModel).filter(
            ReleaseTrackModel.musicbrainz_recording_id == str(candidate["id"])
        ).update(
            {
                ReleaseTrackModel.recording_id: recording.id,
                ReleaseTrackModel.source_song_id: song.id,
            },
            synchronize_session=False,
        )

        for isrc in detail.get("isrcs", []):
            code = str(isrc).strip().upper()
            if not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{3}[0-9]{7}", code):
                continue
            try:
                RecordingService.add_identity(
                    db,
                    recording=recording,
                    provider="isrc",
                    identity_type="code",
                    external_id=code,
                )
            except RecordingIdentityConflict:
                logger.info(
                    "ISRC %s already linked elsewhere; it was not reassigned", code
                )

        recording.title = str(detail.get("title") or song.title)
        if detail.get("length"):
            recording.duration = round(int(detail["length"]) / 1000)
        recording.recording_metadata = {
            **(recording.recording_metadata or {}),
            "identity_status": "verified",
            "metadata_source": "musicbrainz",
        }
        db.flush()
        return recording


recording_service = RecordingService()
