"""Followed-artist release detection and notification.

The refresh step is the only thing that talks to YouTube Music: it pulls each
followed artist's albums/singles through the cached YTMusicService and upserts
them into ReleaseModel. Provider IDs are mirrored into ReleaseIdentityModel;
legacy columns remain populated for existing consumers during migration.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from app.core.config import settings
from app.db.models.artist import ArtistModel
from app.db.models.notification import NotificationModel
from app.db.models.release import ReleaseModel
from app.db.models.release_identity import ReleaseIdentityModel
from app.services.notifications import notification_service
from app.services.ytmusic import ytmusic_service

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.db.models.user import UserModel

logger = logging.getLogger(__name__)


def _parse_iso_date(value: str | None) -> datetime | None:
    """Parse a YYYY-MM-DD string into a UTC datetime, or None."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=UTC)
    except ValueError:
        return None


def _channel_id(artist: ArtistModel) -> str | None:
    external = artist.external_ids or {}
    return external.get("youtube_channel_id")


class ReleaseService:
    """Store and serve releases from followed artists."""

    @staticmethod
    def _sync_identity(
        db: Session,
        *,
        release: ReleaseModel,
        identity_type: str,
        external_id: str | None,
    ) -> None:
        if not external_id:
            return
        existing = (
            db.query(ReleaseIdentityModel)
            .filter(
                ReleaseIdentityModel.release_id == release.id,
                ReleaseIdentityModel.provider == "youtube_music",
                ReleaseIdentityModel.identity_type == identity_type,
                ReleaseIdentityModel.external_id == str(external_id),
            )
            .first()
        )
        if existing is None:
            db.add(
                ReleaseIdentityModel(
                    release_id=release.id,
                    provider="youtube_music",
                    identity_type=identity_type,
                    external_id=str(external_id),
                )
            )

    @staticmethod
    def refresh_followed_artists(db: Session) -> int:
        """Re-sync releases for every artist followed by at least one user."""
        artists = (
            db.query(ArtistModel)
            .filter(ArtistModel.followers.any())
            .all()
        )
        upserted = 0
        for artist in artists:
            upserted += ReleaseService.refresh_artist(db, artist)
        return upserted

    @staticmethod
    def refresh_artist(db: Session, artist: ArtistModel) -> int:
        """Upsert one artist's releases; returns rows added or updated."""
        channel_id = _channel_id(artist)
        if not channel_id:
            return 0

        try:
            releases = ytmusic_service.artist_albums(
                channel_id, limit=settings.ARTIST_CHANNEL_PLAYLIST_LIMIT
            )
        except Exception:
            logger.warning(
                "Release refresh failed for %s", artist.name, exc_info=True
            )
            return 0

        existing = {
            (release.browse_id, release.artist_id): release
            for release in db.query(ReleaseModel)
            .filter(ReleaseModel.artist_id == artist.id)
            .all()
        }

        count = 0
        for raw in releases:
            browse_id = raw.get("browse_id")
            if not browse_id:
                continue
            release_date = _parse_iso_date(raw.get("release_date"))
            stored = existing.get((browse_id, artist.id))
            if stored is None:
                stored = ReleaseModel(
                    artist_id=artist.id,
                    release_type=raw.get("release_type") or "album",
                    title=raw.get("title") or "Untitled",
                    cover_image_url=raw.get("cover_image_url"),
                    release_date=release_date,
                    year=raw.get("year"),
                    browse_id=browse_id,
                    audio_playlist_id=raw.get("audio_playlist_id"),
                )
                db.add(stored)
                db.flush()
                existing[(browse_id, artist.id)] = stored
            else:
                stored.title = raw.get("title") or stored.title
                stored.cover_image_url = raw.get("cover_image_url") or stored.cover_image_url
                stored.release_date = release_date or stored.release_date
                stored.year = raw.get("year") or stored.year
                stored.release_type = raw.get("release_type") or stored.release_type
                stored.audio_playlist_id = (
                    raw.get("audio_playlist_id") or stored.audio_playlist_id
                )

            ReleaseService._sync_identity(
                db, release=stored, identity_type="browse_id", external_id=browse_id
            )
            ReleaseService._sync_identity(
                db,
                release=stored,
                identity_type="audio_playlist_id",
                external_id=raw.get("audio_playlist_id"),
            )
            count += 1
        db.commit()
        return count


    @staticmethod
    def enrich_release_from_musicbrainz(
        db: Session,
        release: ReleaseModel,
        *,
        minimum_score: int = 95,
    ) -> int:
        """Resolve a release conservatively and synchronize its complete tracklist.

        The existing Melora release row remains the catalogue object. MusicBrainz
        release/release-group IDs are attached as identities; track rows are
        replaced only after a valid, non-empty provider tracklist is retrieved.
        """
        import re

        from app.db.models.recording_identity import RecordingIdentityModel
        from app.db.models.release_track import ReleaseTrackModel
        from app.db.models.song import SongModel
        from app.services.recordings import (
            MUSICBRAINZ_HEADERS,
            _musicbrainz_get,
            _normalize_music_text,
        )

        # Do not repeat upstream calls once this release has been resolved.
        cached = (
            db.query(ReleaseIdentityModel)
            .filter(
                ReleaseIdentityModel.release_id == release.id,
                ReleaseIdentityModel.provider == "musicbrainz",
                ReleaseIdentityModel.identity_type == "release_id",
            )
            .first()
        )
        if cached is not None and release.tracks:
            return len(release.tracks)

        artist_names = [artist.name for artist in release.credited_artists]
        if not artist_names and release.artist is not None:
            artist_names = [release.artist.name]
        if not release.title or not artist_names:
            return 0

        escaped_title = release.title.replace('"', '\\"')
        artist_clauses = [
            'artist:"' + name.replace('"', '\\"') + '"'
            for name in artist_names
        ]
        query = 'release:"' + escaped_title + '" AND ' + " AND ".join(artist_clauses)
        try:
            search = _musicbrainz_get(
                "https://musicbrainz.org/ws/2/release",
                {"query": query, "fmt": "json", "limit": "10"},
            )
        except Exception:
            logger.warning("MusicBrainz release search failed for %s", release.id, exc_info=True)
            return 0

        expected_title = _normalize_music_text(release.title)
        expected_artists = {_normalize_music_text(name) for name in artist_names}
        matches = []
        for item in search.get("releases", []):
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
            matches.append(item)

        if len(matches) != 1:
            logger.info(
                "MusicBrainz release unresolved for %s (%d strict matches)",
                release.id,
                len(matches),
            )
            return 0

        candidate = matches[0]
        try:
            detail = _musicbrainz_get(
                f"https://musicbrainz.org/ws/2/release/{candidate['id']}",
                {"fmt": "json", "inc": "recordings+artist-credits+release-groups"},
            )
        except Exception:
            logger.warning("MusicBrainz release detail failed for %s", candidate["id"], exc_info=True)
            return 0

        media = detail.get("media") or []
        track_specs = []
        for disc_number, medium in enumerate(media, start=1):
            for position, track in enumerate(medium.get("tracks") or [], start=1):
                recording_data = track.get("recording") or {}
                title = str(track.get("title") or recording_data.get("title") or "").strip()
                if not title:
                    continue
                track_specs.append(
                    {
                        "title": title,
                        "position": int(track.get("position") or position),
                        "disc_number": int(medium.get("position") or disc_number),
                        "duration": (
                            round(int(track["length"]) / 1000)
                            if track.get("length")
                            else (
                                round(int(recording_data["length"]) / 1000)
                                if recording_data.get("length")
                                else None
                            )
                        ),
                        "track_id": track.get("id"),
                        "recording_mbid": recording_data.get("id"),
                    }
                )

        # Never erase a known tracklist because a provider response was partial.
        if not track_specs:
            return 0

        recording_ids = {
            item["recording_mbid"]
            for item in track_specs
            if item["recording_mbid"]
        }
        identity_rows = (
            db.query(RecordingIdentityModel)
            .filter(
                RecordingIdentityModel.provider == "musicbrainz",
                RecordingIdentityModel.identity_type == "recording_id",
                RecordingIdentityModel.external_id.in_(recording_ids),
            )
            .all()
            if recording_ids
            else []
        )
        recording_by_mbid = {row.external_id: row.recording_id for row in identity_rows}

        # Link only to existing canonical recordings and playable songs.
        canonical_ids = set(recording_by_mbid.values())
        song_by_recording = {}
        if canonical_ids:
            songs = (
                db.query(SongModel)
                .filter(SongModel.recording_id.in_(canonical_ids))
                .all()
            )
            for song in songs:
                song_by_recording.setdefault(song.recording_id, song.id)

        # Replace the release's track rows atomically after the complete
        # provider response has been parsed and validated.
        db.query(ReleaseTrackModel).filter(
            ReleaseTrackModel.release_id == release.id
        ).delete(synchronize_session=False)
        for spec in track_specs:
            canonical_id = recording_by_mbid.get(spec["recording_mbid"])
            db.add(
                ReleaseTrackModel(
                    release_id=release.id,
                    recording_id=canonical_id,
                    source_song_id=song_by_recording.get(canonical_id),
                    title=spec["title"],
                    position=spec["position"],
                    disc_number=spec["disc_number"],
                    duration=spec["duration"],
                    musicbrainz_track_id=spec["track_id"],
                )
            )

        ReleaseService._sync_musicbrainz_identity(
            db, release=release, identity_type="release_id",
            external_id=str(candidate["id"]),
        )
        release_group = detail.get("release-group") or {}
        if release_group.get("id"):
            ReleaseService._sync_musicbrainz_identity(
                db, release=release, identity_type="release_group_id",
                external_id=str(release_group["id"]),
            )
        db.commit()
        return len(track_specs)

    @staticmethod
    def _sync_musicbrainz_identity(
        db: Session,
        *,
        release: ReleaseModel,
        identity_type: str,
        external_id: str,
    ) -> None:
        existing = (
            db.query(ReleaseIdentityModel)
            .filter(
                ReleaseIdentityModel.provider == "musicbrainz",
                ReleaseIdentityModel.identity_type == identity_type,
                ReleaseIdentityModel.external_id == external_id,
            )
            .first()
        )
        if existing is not None:
            if existing.release_id != release.id:
                logger.warning(
                    "MusicBrainz %s %s is already assigned to another Melora release",
                    identity_type, external_id,
                )
            return
        db.add(
            ReleaseIdentityModel(
                release_id=release.id,
                provider="musicbrainz",
                identity_type=identity_type,
                external_id=external_id,
            )
        )

    @staticmethod
    def get_followed_releases(
        db: Session,
        *,
        user: UserModel,
        limit: int = settings.RELEASES_PAGE_SIZE_DEFAULT,
        offset: int = 0,
        artist_id: str | None = None,
    ) -> dict[str, Any]:
        """Releases from artists the user follows, newest first."""
        artist_ids = [a.id for a in user.followed_artists]
        if not artist_ids:
            return {"total": 0, "items": []}

        cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(
            days=settings.RELEASES_RECENCY_DAYS
        )
        query = db.query(ReleaseModel).filter(
            ReleaseModel.artist_id.in_(artist_ids),
            ReleaseModel.release_date.isnot(None),
            ReleaseModel.release_date >= cutoff,
        )
        if artist_id:
            query = query.filter(ReleaseModel.artist_id == artist_id)

        total = query.count()
        releases = (
            query.order_by(ReleaseModel.release_date.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        notified_release_ids: set[str] = set()
        rows = (
            db.query(NotificationModel.data)
            .filter(
                NotificationModel.user_id == user.id,
                NotificationModel.type == "new_release",
            )
            .all()
        )
        for (data,) in rows:
            if isinstance(data, dict) and data.get("release_id"):
                notified_release_ids.add(data["release_id"])

        items: list[dict[str, Any]] = []
        for release in releases:
            artist = release.artist
            is_new = (
                release.id not in notified_release_ids
                and release.release_date is not None
                and release.release_date >= cutoff
            )
            items.append(
                {
                    "id": release.id,
                    "artist": {
                        "id": artist.id,
                        "name": artist.name,
                        "slug": artist.slug,
                        "thumbnail": artist.thumbnail_url,
                    },
                    "release_type": release.release_type,
                    "title": release.title,
                    "cover_image_url": release.cover_image_url,
                    "release_date": (
                        release.release_date.isoformat()
                        if release.release_date
                        else None
                    ),
                    "year": release.year,
                    "browse_id": release.browse_id,
                    "audio_playlist_id": release.audio_playlist_id,
                    "is_new": is_new,
                }
            )
        return {"total": total, "items": items}

    @staticmethod
    def notify_new_releases(db: Session, *, user: UserModel) -> int:
        """Create in-app notifications for unseen recent releases."""
        releases = ReleaseService.get_followed_releases(
            db, user=user, limit=settings.RELEASES_PAGE_SIZE_MAX
        )
        created = 0
        for release in releases["items"]:
            if not release["is_new"]:
                continue
            artist_name = release["artist"]["name"]
            notification_service.dispatch(
                db,
                user=user,
                event_type="new_release",
                title=f"New from {artist_name}",
                message=f"{artist_name} released “{release['title']}”",
                data={
                    "release_id": release["id"],
                    "artist_id": release["artist"]["id"],
                    "artist_slug": release["artist"]["slug"],
                    "album_id": release["browse_id"],
                },
            )
            created += 1
        return created


release_service = ReleaseService()
