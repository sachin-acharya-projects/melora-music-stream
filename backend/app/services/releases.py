"""Followed-artist release detection and notification.

The refresh step is the only thing that talks to YouTube Music: it pulls each
followed artist's albums/singles through the cached ``YTMusicService`` and
upserts them into ``ReleaseModel``. Everything else (the feed endpoint, the
"is this new" flag, the notification creation) is a pure DB read, so page
loads never touch the network.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from app.core.config import settings
from app.db.models.artist import ArtistModel
from app.db.models.notification import NotificationModel
from app.db.models.release import ReleaseModel
from app.services.notifications import notification_service
from app.services.ytmusic import ytmusic_service

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.db.models.user import UserModel

logger = logging.getLogger(__name__)


def _parse_iso_date(value: str | None) -> datetime | None:
    """Parse a ``YYYY-MM-DD`` string into a UTC datetime, or ``None``."""
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
    def refresh_followed_artists(db: Session) -> int:
        """Re-sync releases for every artist followed by at least one user.

        Returns the number of release rows upserted. Each artist's YTMusic
        payload is cached, so repeated runs stay cheap.
        """
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
                db.add(
                    ReleaseModel(
                        artist_id=artist.id,
                        release_type=raw.get("release_type") or "album",
                        title=raw.get("title") or "Untitled",
                        cover_image_url=raw.get("cover_image_url"),
                        release_date=release_date,
                        year=raw.get("year"),
                        browse_id=browse_id,
                        audio_playlist_id=raw.get("audio_playlist_id"),
                    )
                )
            else:
                stored.title = raw.get("title") or stored.title
                stored.cover_image_url = raw.get("cover_image_url") or stored.cover_image_url
                stored.release_date = release_date or stored.release_date
                stored.year = raw.get("year") or stored.year
                stored.release_type = raw.get("release_type") or stored.release_type
                stored.audio_playlist_id = (
                    raw.get("audio_playlist_id") or stored.audio_playlist_id
                )
            count += 1
        db.commit()
        return count

    @staticmethod
    def get_followed_releases(
        db: Session,
        *,
        user: UserModel,
        limit: int = settings.RELEASES_PAGE_SIZE_DEFAULT,
        offset: int = 0,
        artist_id: str | None = None,
    ) -> dict[str, Any]:
        """Releases from artists the user follows, newest first.

        Each item carries ``is_new`` = a release within the recency window
        that has not yet produced an in-app notification for this user.
        """
        artist_ids = [a.id for a in user.followed_artists]
        if not artist_ids:
            return {"total": 0, "items": []}

        # SQLite round-trips datetimes as naive, so compare against a naive
        # cutoff (UTC) the same way stats.py does.
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
        """Create in-app notifications for unseen recent releases.

        Called from the background job after a refresh. Returns the number of
        notifications dispatched.
        """
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
