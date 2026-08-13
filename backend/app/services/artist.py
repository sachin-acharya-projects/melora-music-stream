from __future__ import annotations

import logging
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from fastapi import HTTPException
from sqlalchemy import asc, desc, func, or_
from ytmusicapi import YTMusic

from app.core.config import settings
from app.core.messages import Messages
from app.db.base import SessionLocal
from app.db.models.artist import ArtistModel
from app.db.models.associations import song_artist, user_artist_follows
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel, UserRole
from app.schemas.song import Song
from app.services.metadata_enrichment import ArtistEnricher
from app.services.songs import SongService
from app.services.stats import StatsService
from app.services.youtube import youtube_service

if TYPE_CHECKING:
    from sqlalchemy.orm import Query, Session
    from sqlalchemy.sql.elements import ColumnElement

logger = logging.getLogger(__name__)

ARTIST_NAME_SPLIT = re.compile(r"\s+(?:feat\.?|featuring|ft\.?)\s+|\s*[,&]\s*")

# Per-user in-memory suggestion cache: user_id -> (expiry timestamp, items).
_SUGGESTIONS_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}


class ArtistService:
    """Artist persistence, serialization, enrichment, and follows."""

    @staticmethod
    def slugify(name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        return slug or "artist"

    @staticmethod
    def get_or_create_artist(
        db: Session, name: str, *, youtube_channel_id: str | None = None
    ) -> ArtistModel:
        name = name.strip()
        if not name:
            raise HTTPException(status_code=400, detail=Messages.ARTIST_NAME_REQUIRED)

        db_artist = (
            db.query(ArtistModel)
            .filter(func.lower(ArtistModel.name) == name.lower())
            .first()
        )
        if db_artist is not None:
            if youtube_channel_id:
                external = dict(db_artist.external_ids or {})
                if not external.get("youtube_channel_id"):
                    external["youtube_channel_id"] = youtube_channel_id
                    db_artist.external_ids = external
                    db.commit()
            return db_artist

        slug = ArtistService.slugify(name)
        if db.query(ArtistModel).filter(ArtistModel.slug == slug).first() is not None:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        db_artist = ArtistModel(name=name, slug=slug)
        if youtube_channel_id:
            db_artist.external_ids = {
                **dict(db_artist.external_ids or {}),
                "youtube_channel_id": youtube_channel_id,
            }
        db.add(db_artist)
        db.commit()
        db.refresh(db_artist)
        return db_artist

    @staticmethod
    def sync_song_artists(db: Session, song: SongModel) -> None:
        """Parse the song uploader into artist names and link them to the song."""
        if song.artists:
            return
        uploader = (song.uploader or "").strip()
        if not uploader:
            return
        names = [part for part in ARTIST_NAME_SPLIT.split(uploader) if part.strip()]
        if not names:
            return
        song.artists = [ArtistService.get_or_create_artist(db, part) for part in names]
        db.commit()

    @staticmethod
    def register_artist_if_threshold_reached(
        db: Session, *, song: SongModel, user_id: str
    ) -> None:
        """Materialize and link artists once the user passes the play threshold.

        Artists are never created by queue or playlist sync. They are only
        materialized (and their library songs linked) after the user has
        played songs from the same uploader at least
        :data:`settings.ARTIST_REGISTRATION_THRESHOLD` times.
        """
        uploader = (song.uploader or "").strip()
        if not uploader:
            return

        artist_exists = (
            db.query(func.count(ArtistModel.id))
            .filter(func.lower(ArtistModel.name) == uploader.lower())
            .scalar()
        )
        if not artist_exists:
            plays = (
                db.query(func.count(ListeningHistoryModel.id))
                .join(SongModel, ListeningHistoryModel.song_id == SongModel.id)
                .filter(
                    ListeningHistoryModel.user_id == user_id,
                    func.lower(SongModel.uploader) == uploader.lower(),
                )
                .scalar()
            )
            if (plays or 0) < settings.ARTIST_REGISTRATION_THRESHOLD:
                return

        uploader_songs = (
            db.query(SongModel)
            .filter(func.lower(SongModel.uploader) == uploader.lower())
            .all()
        )
        for uploader_song in uploader_songs:
            ArtistService.sync_song_artists(db, uploader_song)

    @staticmethod
    def _registered_filter(db: Session, user_id: str) -> ColumnElement[bool]:
        """SQL predicate for artists registered to a user.

        Registered means the user has played the artist's songs at least
        :data:`settings.ARTIST_REGISTRATION_THRESHOLD` times, has explicitly followed
        the artist, or imported the artist from YouTube.
        """
        threshold_artist_ids = (
            db.query(song_artist.c.artist_id)
            .join(
                ListeningHistoryModel,
                ListeningHistoryModel.song_id == song_artist.c.song_id,
            )
            .filter(ListeningHistoryModel.user_id == user_id)
            .group_by(song_artist.c.artist_id)
            .having(
                func.count(ListeningHistoryModel.id)
                >= settings.ARTIST_REGISTRATION_THRESHOLD
            )
            .subquery()
        )
        followed_artist_ids = (
            db.query(user_artist_follows.c.artist_id)
            .filter(user_artist_follows.c.user_id == user_id)
            .subquery()
        )
        return or_(
            ArtistModel.id.in_(db.query(threshold_artist_ids.c.artist_id)),
            ArtistModel.id.in_(db.query(followed_artist_ids.c.artist_id)),
            ArtistModel.external_ids["youtube_channel_id"]
            .as_string()
            .isnot(None),
        )

    @staticmethod
    def _artist_registered(
        artist: ArtistModel, user_id: str, *, plays: int = 0
    ) -> bool:
        """Whether an artist counts as registered for a user (Python-side)."""
        if plays >= settings.ARTIST_REGISTRATION_THRESHOLD:
            return True
        if (artist.external_ids or {}).get("youtube_channel_id"):
            return True
        return any(follower.id == user_id for follower in artist.followers)

    @staticmethod
    def _more_info(artist: ArtistModel) -> dict[str, Any] | None:
        metadata = artist.channel_metadata or {}
        if not metadata:
            return None
        return {
            "description": artist.bio or metadata.get("description") or "",
            "subscribers": metadata.get("subscribers"),
            "view_count": metadata.get("view_count"),
            "video_count": metadata.get("video_count"),
            "country": metadata.get("country"),
            "is_verified": metadata.get("is_verified"),
            "handle": metadata.get("handle"),
            "channel_url": metadata.get("channel_url"),
            "links": metadata.get("links") or [],
        }

    @staticmethod
    def _published_filter() -> ColumnElement[bool]:
        """SQL predicate for content admins have published to the catalog."""
        return ArtistModel.is_published.is_(True)

    @staticmethod
    def serialize(
        artist: ArtistModel, *, current_user_id: str | None
    ) -> dict[str, Any]:
        return {
            "id": artist.id,
            "name": artist.name,
            "slug": artist.slug,
            "thumbnail_url": artist.thumbnail_url,
            "bio": artist.bio,
            "genres": artist.genres or [],
            "monthly_listeners": artist.monthly_listeners,
            "follower_count": artist.follower_count or 0,
            "is_following": current_user_id is not None
            and any(f.id == current_user_id for f in artist.followers),
            "is_enriched": artist.enriched_at is not None,
            "is_from_youtube": bool(
                (artist.external_ids or {}).get("youtube_channel_id")
            ),
            "is_featured": bool(artist.is_featured),
            "is_published": bool(artist.is_published),
            "more_info": ArtistService._more_info(artist),
        }

    @staticmethod
    def get_all_artists(
        db: Session,
        user: UserModel,
        *,
        search: str | None = None,
        sort_by: str = "follower_count",
        order: str = "desc",
        page: int = 1,
        page_size: int = 50,
        source: str | None = None,
    ) -> dict[str, Any]:
        if sort_by == "plays":
            return ArtistService._get_all_artists_by_plays(
                db,
                user,
                search=search,
                order=order,
                page=page,
                page_size=page_size,
                source=source,
            )
        query = db.query(ArtistModel)
        query = query.filter(ArtistService._registered_filter(db, user.id))
        query = query.filter(ArtistService._published_filter())
        query = ArtistService._apply_source_filter(query, source)
        if search:
            query = query.filter(ArtistModel.name.ilike(f"%{search}%"))
        sort_col = getattr(ArtistModel, sort_by)
        order_func = asc if order == "asc" else desc
        total = query.count()
        artists = (
            query.order_by(order_func(sort_col))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "items": [
                ArtistService.serialize(artist, current_user_id=user.id)
                for artist in artists
            ],
        }

    @staticmethod
    def _apply_source_filter(query: Query[Any], source: str | None) -> Query[Any]:
        if source == "youtube":
            return query.filter(
                ArtistModel.external_ids["youtube_channel_id"]
                .as_string()
                .isnot(None)
            )
        if source == "platform":
            return query.filter(
                ArtistModel.external_ids["youtube_channel_id"].as_string().is_(None)
            )
        return query

    @staticmethod
    def _get_all_artists_by_plays(
        db: Session,
        user: UserModel,
        *,
        search: str | None = None,
        order: str = "desc",
        page: int = 1,
        page_size: int = 50,
        source: str | None = None,
    ) -> dict[str, Any]:
        top = StatsService.get_stats(db, user_id=user.id)["top_artists"]
        names = [entry["name"] for entry in top]
        artists_query = db.query(ArtistModel).filter(
            func.lower(ArtistModel.name).in_([n.lower() for n in names]),
            ArtistModel.is_published.is_(True),
        )
        artists_query = ArtistService._apply_source_filter(artists_query, source)
        artists_by_name = {
            (artist.name or "").lower(): artist for artist in artists_query.all()
        }
        matched: list[tuple[ArtistModel, int]] = []
        for entry in top:
            artist = artists_by_name.get(entry["name"].lower())
            if artist is None:
                continue
            if not ArtistService._artist_registered(
                artist, user.id, plays=entry["plays"]
            ):
                continue
            if search and search.lower() not in artist.name.lower():
                continue
            matched.append((artist, entry["plays"]))

        if order == "asc":
            matched.reverse()

        total = len(matched)
        start = (page - 1) * page_size
        items: list[dict[str, Any]] = []
        for artist, plays in matched[start : start + page_size]:
            item = ArtistService.serialize(artist, current_user_id=user.id)
            item["play_count"] = plays
            items.append(item)
        return {"total": total, "items": items}

    @staticmethod
    def get_following_artists(
        db: Session,
        user: UserModel,
        *,
        search: str | None = None,
        source: str | None = None,
    ) -> list[dict[str, Any]]:
        query = (
            db.query(ArtistModel)
            .join(ArtistModel.followers)
            .filter(UserModel.id == user.id, ArtistModel.is_published.is_(True))
        )
        query = ArtistService._apply_source_filter(query, source)
        if search:
            query = query.filter(ArtistModel.name.ilike(f"%{search}%"))
        artists = query.all()
        return [
            ArtistService.serialize(artist, current_user_id=user.id)
            for artist in artists
        ]

    @staticmethod
    def get_featured_artists(db: Session, user: UserModel) -> dict[str, Any]:
        """Build the Browse Artists featured carousel sections.

        Returns labeled sections: Suggested for You (related-artist picks
        based on listening history), Popular (by monthly listeners), the
        user's Top Artists, Most Followed, and Recently Added.
        """
        sections: list[dict[str, Any]] = []

        def add_section(
            key: str,
            title: str,
            artists: list[ArtistModel],
            *,
            play_counts: dict[str, int] | None = None,
        ) -> None:
            items: list[dict[str, Any]] = []
            for artist in artists:
                item = ArtistService.serialize(artist, current_user_id=user.id)
                if play_counts and artist.id in play_counts:
                    item["play_count"] = play_counts[artist.id]
                items.append(item)
            if items:
                sections.append({"key": key, "title": title, "items": items})

        suggested = ArtistService._suggested_artists(db, user.id)
        if suggested:
            sections.append(
                {"key": "suggested", "title": "Suggested for You", "items": suggested}
            )

        popular = (
            db.query(ArtistModel)
            .filter(
                ArtistService._registered_filter(db, user.id),
                ArtistModel.is_published.is_(True),
            )
            .order_by(
                ArtistModel.monthly_listeners.desc().nulls_last(),
                ArtistModel.id,
            )
            .limit(settings.ARTIST_FEATURED_SECTION_LIMIT)
            .all()
        )
        add_section("popular", "Popular", popular)

        top = StatsService.get_top_artists(
            db, user_id=user.id, limit=settings.ARTIST_TOP_SONGS_LIMIT
        )
        play_counts: dict[str, int] = {}
        if top:
            names = [entry["name"] for entry in top]
            artists_by_name = {
                (artist.name or "").lower(): artist
                for artist in db.query(ArtistModel)
                .filter(
                    func.lower(ArtistModel.name).in_([name.lower() for name in names]),
                    ArtistModel.is_published.is_(True),
                )
                .all()
            }
            matched: list[ArtistModel] = []
            for entry in top:
                artist = artists_by_name.get(entry["name"].lower())
                if artist is None:
                    continue
                if not ArtistService._artist_registered(
                    artist, user.id, plays=entry["plays"]
                ):
                    continue
                matched.append(artist)
                play_counts[artist.id] = entry["plays"]
            add_section("top", "Your Top Artists", matched, play_counts=play_counts)

        most_followed = (
            db.query(ArtistModel)
            .filter(
                ArtistService._registered_filter(db, user.id),
                ArtistModel.is_published.is_(True),
            )
            .order_by(ArtistModel.follower_count.desc(), ArtistModel.id)
            .limit(settings.ARTIST_FEATURED_SECTION_LIMIT)
            .all()
        )
        add_section("most_followed", "Most Followed", most_followed)

        recent = (
            db.query(ArtistModel)
            .filter(
                ArtistService._registered_filter(db, user.id),
                ArtistModel.is_published.is_(True),
            )
            .order_by(ArtistModel.created_at.desc(), ArtistModel.id)
            .limit(settings.ARTIST_FEATURED_SECTION_LIMIT)
            .all()
        )
        add_section("recent", "Recently Added", recent)

        return {"sections": sections}

    @staticmethod
    def get_suggested_artists(
        db: Session, user_id: str, *, page: int = 1, page_size: int = 20
    ) -> dict[str, Any]:
        """Return a page of suggested artists for the user."""
        items = ArtistService._suggested_artists(
            db, user_id, limit=settings.ARTIST_SUGGESTIONS_MAX
        )
        start = (page - 1) * page_size
        return {
            "total": len(items),
            "items": items[start : start + page_size],
        }

    @staticmethod
    def _suggested_artists(
        db: Session,
        user_id: str,
        *,
        limit: int = settings.ARTIST_FEATURED_SECTION_LIMIT,
    ) -> list[dict[str, Any]]:
        """Artist picks based on the user's listening history.

        Primary source is YouTube Music "fans might also like" for the user's
        most-played artists. Falls back to genre overlap over the local
        library when the network source is unavailable. The full ranked list
        is cached per user so the featured carousel and a "View All" page
        share a single fetch, and each call returns up to ``limit`` items.
        """
        cached = _SUGGESTIONS_CACHE.get(user_id)
        if cached is not None:
            expiry, items = cached
            if time.monotonic() < expiry:
                return items[:limit]

        items = ArtistService._discover_related_artists(db, user_id)
        if not items:
            items = ArtistService._genre_based_suggestions(db, user_id)

        ttl = (
            settings.ARTIST_SUGGESTIONS_TTL_SECONDS
            if items
            else settings.ARTIST_SUGGESTIONS_RETRY_SECONDS
        )
        _SUGGESTIONS_CACHE[user_id] = (time.monotonic() + ttl, items)
        return items[:limit]

    @staticmethod
    def _discover_related_artists(db: Session, user_id: str) -> list[dict[str, Any]]:
        """Fetch "fans might also like" artists from YouTube Music."""
        top = StatsService.get_top_artists(
            db, user_id=user_id, limit=settings.ARTIST_SUGGESTIONS_TOP_ARTISTS
        )
        top_names = [entry["name"] for entry in top if entry.get("name")]
        if not top_names:
            return []

        try:
            ytmusic = YTMusic()
        except Exception:
            return []

        known_names = {
            name.lower() for (name,) in db.query(ArtistModel.name).all() if name
        }
        known_names.update(name.lower() for name in top_names)

        candidates: dict[str, dict[str, Any]] = {}

        def fetch(artist_name: str) -> None:
            try:
                results = ytmusic.search(artist_name, filter="artists", limit=1)
                if not results or not results[0].get("browseId"):
                    return
                info = ytmusic.get_artist(results[0]["browseId"])
            except Exception:
                return
            for related in info.get("related", {}).get("results", []):
                title = related.get("title")
                channel_id = related.get("browseId")
                if not title or not channel_id:
                    continue
                if title.lower() in known_names:
                    continue
                candidate = candidates.get(channel_id)
                if candidate is None:
                    thumbnails = related.get("thumbnails") or []
                    candidates[channel_id] = candidate = {
                        "name": title,
                        "channel_id": channel_id,
                        "thumbnail_url": (
                            thumbnails[-1]["url"] if thumbnails else None
                        ),
                        "subscribers": ArtistService._parse_subscriber_count(
                            related.get("subscribers")
                        ),
                        "sources": [],
                    }
                if artist_name not in candidate["sources"]:
                    candidate["sources"].append(artist_name)

        with ThreadPoolExecutor(max_workers=len(top_names)) as pool:
            list(pool.map(fetch, top_names))

        ranked = sorted(
            candidates.values(),
            key=lambda c: (len(c["sources"]), c["subscribers"]),
            reverse=True,
        )
        items: list[dict[str, Any]] = []
        for candidate in ranked[: settings.ARTIST_SUGGESTIONS_MAX]:
            items.append(
                {
                    "id": candidate["channel_id"],
                    "name": candidate["name"],
                    "slug": ArtistService.slugify(candidate["name"]),
                    "thumbnail_url": candidate["thumbnail_url"],
                    "bio": None,
                    "genres": [],
                    "monthly_listeners": None,
                    "follower_count": 0,
                    "subscribers": candidate["subscribers"],
                    "is_following": False,
                    "is_enriched": False,
                    "is_from_youtube": True,
                    "is_external": True,
                    "reason": (f"Because you listen to {candidate['sources'][0]}"),
                }
            )
        return items

    @staticmethod
    def _parse_subscriber_count(value: Any) -> int:  # noqa: ANN401
        """Parse a subscriber count like "1.42M" into an integer."""
        if isinstance(value, (int, float)):
            return int(value)
        if not isinstance(value, str):
            return 0
        text = value.replace(",", "").strip()
        multiplier = 1
        if text.endswith(("M", "m")):
            multiplier = 1_000_000
            text = text[:-1]
        elif text.endswith(("K", "k")):
            multiplier = 1_000
            text = text[:-1]
        try:
            return int(float(text) * multiplier)
        except ValueError:
            return 0

    @staticmethod
    def _genre_based_suggestions(db: Session, user_id: str) -> list[dict[str, Any]]:
        """Rank unplayed library artists by weighted genre overlap."""
        genre_plays = {
            entry["name"]: entry["plays"]
            for entry in StatsService.get_genres(db, user_id=user_id)
        }
        if not genre_plays:
            return []

        played_artist_ids = {
            row[0]
            for row in db.query(song_artist.c.artist_id)
            .join(
                ListeningHistoryModel,
                ListeningHistoryModel.song_id == song_artist.c.song_id,
            )
            .filter(ListeningHistoryModel.user_id == user_id)
            .distinct()
            .all()
        }
        followed_artist_ids = {
            row[0]
            for row in db.query(user_artist_follows.c.artist_id)
            .filter(user_artist_follows.c.user_id == user_id)
            .all()
        }
        known_ids = played_artist_ids | followed_artist_ids

        scored: list[tuple[int, int, ArtistModel, str]] = []
        for artist in (
            db.query(ArtistModel)
            .filter(ArtistModel.is_published.is_(True))
            .all()
        ):
            if artist.id in known_ids:
                continue
            overlaps = [
                (genre_plays[genre], genre)
                for genre in artist.genres or []
                if genre in genre_plays
            ]
            if not overlaps:
                continue
            overlaps.sort(reverse=True)
            score = sum(plays for plays, _ in overlaps)
            scored.append(
                (score, artist.monthly_listeners or 0, artist, overlaps[0][1])
            )

        scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
        items: list[dict[str, Any]] = []
        for _, _, artist, genre in scored[: settings.ARTIST_SUGGESTIONS_MAX]:
            item = ArtistService.serialize(artist, current_user_id=user_id)
            item["reason"] = f"Because you listen to {genre}"
            items.append(item)
        return items

    @staticmethod
    def _song_payload(song: SongModel) -> dict[str, Any]:
        return {
            "id": song.id,
            "title": song.title,
            "uploader": song.uploader,
            "thumbnail": song.thumbnail,
            "duration": song.duration,
            "created_at": song.created_at.isoformat()
            if song.created_at is not None
            else None,
        }

    @staticmethod
    def _song_dicts(artist: ArtistModel) -> list[dict[str, Any]]:
        songs = sorted(
            (song for song in artist.songs if song.is_published),
            key=lambda s: s.created_at.isoformat() if s.created_at else "",
            reverse=True,
        )
        return [ArtistService._song_payload(song) for song in songs]

    @staticmethod
    def _ytmusic_thumbnail(thumbnails: Any) -> str | None:  # noqa: ANN401
        """Pick the highest-resolution thumbnail URL from a YTMusic item."""
        if isinstance(thumbnails, list) and thumbnails:
            url = (
                thumbnails[-1].get("url") if isinstance(thumbnails[-1], dict) else None
            )
            if isinstance(url, str):
                return url
        return None

    @staticmethod
    def _upsert_ytmusic_song(
        db: Session, track: dict[str, Any], artist_name: str
    ) -> None:
        """Upsert a YTMusic track (videoId) as a library song for the artist."""
        video_id = track.get("videoId")
        if not video_id:
            return
        db_song = SongService.upsert_song(
            db,
            Song(
                id=video_id,
                title=track.get("title") or "Unknown Title",
                uploader=artist_name,
                thumbnail=ArtistService._ytmusic_thumbnail(track.get("thumbnails"))
                or "",
                duration=0,
            ),
        )
        ArtistService.sync_song_artists(db, db_song)

    @staticmethod
    def sync_ytmusic_content(db: Session, artist: ArtistModel, channel_id: str) -> None:
        """Import the artist's YTMusic top songs and albums into the library.

        YouTube Music artist channels expose no "Videos" tab, so channel-upload
        extraction returns nothing. This falls back to ytmusicapi to collect
        the top songs plus each album's tracklist, storing the album layout in
        ``channel_metadata["ytmusic_albums"]`` so it can be served offline.
        """
        try:
            ytmusic = YTMusic()
            info = ytmusic.get_artist(channel_id)
        except Exception:
            logger.warning(
                "Failed to fetch YTMusic content for %s", channel_id, exc_info=True
            )
            return

        for track in info.get("songs", {}).get("results", []):
            try:
                ArtistService._upsert_ytmusic_song(db, track, artist.name)
            except Exception:
                db.rollback()
                logger.warning(
                    "Failed to import YTMusic top song %r",
                    track.get("videoId"),
                    exc_info=True,
                )

        albums: list[dict[str, Any]] = []
        album_results = info.get("albums", {}).get("results", [])[
            : settings.ARTIST_CHANNEL_PLAYLIST_LIMIT
        ]
        if album_results:

            def fetch_album(album: dict[str, Any]) -> dict[str, Any] | None:
                try:
                    album_info = ytmusic.get_album(album["browseId"])
                except Exception:
                    logger.warning(
                        "Failed to fetch YTMusic album %s",
                        album.get("browseId"),
                        exc_info=True,
                    )
                    return None
                tracks = [
                    {
                        "videoId": track.get("videoId"),
                        "title": track.get("title"),
                        "thumbnails": track.get("thumbnails"),
                    }
                    for track in album_info.get("tracks", [])
                    if track.get("videoId")
                ]
                return {
                    "id": album.get("browseId"),
                    "name": album.get("title") or "Untitled Album",
                    "year": album.get("year"),
                    "cover_image_url": ArtistService._ytmusic_thumbnail(
                        album.get("thumbnails")
                    ),
                    "tracks": tracks,
                }

            with ThreadPoolExecutor(
                max_workers=min(settings.ARTIST_IMPORT_MAX_WORKERS, len(album_results))
            ) as pool:
                results = list(pool.map(fetch_album, album_results))

            for result in results:
                if result is None:
                    continue
                for track in result["tracks"]:
                    ArtistService._upsert_ytmusic_song(db, track, artist.name)
                albums.append(
                    {
                        "id": result["id"],
                        "name": result["name"],
                        "year": result["year"],
                        "cover_image_url": result["cover_image_url"],
                        "track_ids": [t["videoId"] for t in result["tracks"]],
                    }
                )

        metadata = dict(artist.channel_metadata or {})
        metadata["ytmusic_albums"] = albums
        artist.channel_metadata = metadata
        db.commit()

    @staticmethod
    def _channel_id(artist: ArtistModel) -> str | None:
        external = artist.external_ids or {}
        return external.get("youtube_channel_id")

    @staticmethod
    def _channel_song(song: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": song.get("id"),
            "title": song.get("title") or "Unknown Title",
            "uploader": song.get("uploader") or "Unknown Artist",
            "thumbnail": song.get("thumbnail") or "",
            "duration": song.get("duration") or 0,
            "created_at": None,
        }

    @staticmethod
    def _cached_channel_uploads(
        db: Session,
        db_artist: ArtistModel,
        channel_id: str,
        *,
        limit: int = settings.ARTIST_UPLOADS_LIMIT,
    ) -> list[dict[str, Any]]:
        """Return the channel's uploads, cached in ``channel_metadata``.

        Fetching a channel's Videos tab with yt-dlp is slow, so the result is
        stored in ``channel_metadata["uploads_cache"]`` alongside a timestamp
        and served from there until it exceeds
        :data:`settings.ARTIST_CHANNEL_CACHE_TTL_SECONDS`. A failed refresh
        falls back to the last known-good snapshot when one exists.
        """
        metadata = dict(db_artist.channel_metadata or {})
        cached = metadata.get("uploads_cache")
        if (
            isinstance(cached, dict)
            and isinstance(cached.get("items"), list)
            and time.time() - float(cached.get("fetched_at") or 0)
            < settings.ARTIST_CHANNEL_CACHE_TTL_SECONDS
        ):
            return cast("list[dict[str, Any]]", cached["items"])

        try:
            uploads = youtube_service.get_channel_uploads(channel_id, limit=limit)
        except Exception:
            logger.warning(
                "Failed to fetch channel uploads for %s", channel_id, exc_info=True
            )
            return (
                cast("list[dict[str, Any]]", cached["items"])
                if isinstance(cached, dict) and isinstance(cached.get("items"), list)
                else []
            )

        metadata["uploads_cache"] = {"fetched_at": time.time(), "items": uploads}
        db_artist.channel_metadata = metadata
        db.commit()
        return uploads

    @staticmethod
    def _merge_channel_and_library_songs(
        db: Session,
        db_artist: ArtistModel,
        channel_id: str,
        *,
        upload_limit: int = settings.ARTIST_UPLOADS_LIMIT,
    ) -> list[dict[str, Any]]:
        uploads = ArtistService._cached_channel_uploads(
            db, db_artist, channel_id, limit=upload_limit
        )

        songs = [ArtistService._channel_song(s) for s in uploads]
        known = {s["id"] for s in songs}
        for song in ArtistService._song_dicts(db_artist):
            if song["id"] == channel_id:
                continue
            if song["id"] not in known:
                songs.append(song)
                known.add(song["id"])
        return songs

    @staticmethod
    def enrich_artist_in_background(artist_id: str) -> None:
        """Enrich an artist after the HTTP response, in its own DB session."""
        db = SessionLocal()
        try:
            db_artist = (
                db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
            )
            if db_artist is None or db_artist.enriched_at is not None:
                return
            ArtistService.enrich_artist(db, artist_id)
        except Exception:
            logger.warning(
                "Background enrichment failed for artist %s",
                artist_id,
                exc_info=True,
            )
        finally:
            db.close()

    @staticmethod
    def get_artist_by_slug(
        db: Session,
        slug: str,
        user: UserModel | None,
        *,
        enrich: bool = True,
    ) -> dict[str, Any]:
        db_artist = db.query(ArtistModel).filter(ArtistModel.slug == slug).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)
        if not db_artist.is_published and (user is None or user.role != UserRole.ADMIN):
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)

        if enrich:
            ArtistService.enrich_artist(db, db_artist.id)

        return {
            **ArtistService.serialize(
                db_artist, current_user_id=user.id if user else None
            ),
            "songs": ArtistService._song_dicts(db_artist),
        }

    @staticmethod
    def get_recently_played(
        db: Session,
        slug: str,
        user_id: str,
        *,
        limit: int = settings.ARTIST_RECENT_SONGS_LIMIT,
    ) -> list[dict[str, Any]]:
        """Return the user's most recent plays of this artist's songs."""
        db_artist = db.query(ArtistModel).filter(ArtistModel.slug == slug).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)

        songs_by_id = {song.id: song for song in db_artist.songs}
        if not songs_by_id:
            return []

        entries = (
            db.query(ListeningHistoryModel)
            .filter(
                ListeningHistoryModel.user_id == user_id,
                ListeningHistoryModel.song_id.in_(songs_by_id.keys()),
            )
            .order_by(ListeningHistoryModel.played_at.desc())
            .all()
        )

        recent: list[dict[str, Any]] = []
        seen: set[str] = set()
        for entry in entries:
            if entry.song_id in seen or entry.song_id not in songs_by_id:
                continue
            song = songs_by_id[entry.song_id]
            seen.add(entry.song_id)
            recent.append(
                {
                    "id": song.id,
                    "title": song.title,
                    "uploader": song.uploader,
                    "thumbnail": song.thumbnail,
                    "duration": song.duration,
                    "created_at": song.created_at.isoformat()
                    if song.created_at is not None
                    else None,
                    "played_at": entry.played_at.isoformat()
                    if entry.played_at is not None
                    else None,
                }
            )
            if len(recent) >= limit:
                break
        return recent

    @staticmethod
    def get_artist_songs(db: Session, slug: str) -> list[dict[str, Any]]:
        db_artist = db.query(ArtistModel).filter(ArtistModel.slug == slug).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)
        channel_id = ArtistService._channel_id(db_artist)
        if channel_id and not (db_artist.channel_metadata or {}).get("ytmusic_albums"):
            return ArtistService._merge_channel_and_library_songs(
                db, db_artist, channel_id
            )
        return ArtistService._song_dicts(db_artist)

    @staticmethod
    def _stored_ytmusic_albums(db_artist: ArtistModel) -> dict[str, Any]:
        """Build album dicts from a previously imported YTMusic layout."""
        stored = (db_artist.channel_metadata or {}).get("ytmusic_albums") or []
        songs_by_id = {song.id: song for song in db_artist.songs}
        albums: list[dict[str, Any]] = []
        for album in stored:
            songs = [
                ArtistService._song_payload(songs_by_id[track_id])
                for track_id in album.get("track_ids") or []
                if track_id in songs_by_id
            ]
            albums.append(
                {
                    "id": album.get("id"),
                    "name": album.get("name") or "Untitled Album",
                    "cover_image_url": album.get("cover_image_url"),
                    "songs": songs,
                }
            )
        return {"albums": albums}

    @staticmethod
    def get_artist_albums(db: Session, slug: str) -> dict[str, Any]:
        """Return songs grouped into albums.

        For artists linked to a YouTube channel the channel's playlists are
        surfaced as albums, plus a "Singles" bucket for anything else. Artists
        imported from YouTube Music serve their stored album layout. Library
        artists are grouped into a single "Singles" bucket.
        """
        db_artist = db.query(ArtistModel).filter(ArtistModel.slug == slug).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)
        if (db_artist.channel_metadata or {}).get("ytmusic_albums") is not None:
            return ArtistService._stored_ytmusic_albums(db_artist)
        channel_id = ArtistService._channel_id(db_artist)
        if not channel_id:
            return {
                "albums": [
                    {
                        "id": None,
                        "name": "Singles",
                        "cover_image_url": None,
                        "songs": ArtistService._song_dicts(db_artist),
                    }
                ]
            }

        metadata = dict(db_artist.channel_metadata or {})
        cached = metadata.get("albums_cache")
        if (
            isinstance(cached, dict)
            and isinstance(cached.get("albums"), list)
            and time.time() - float(cached.get("fetched_at") or 0)
            < settings.ARTIST_CHANNEL_CACHE_TTL_SECONDS
        ):
            return {"albums": cast("list[dict[str, Any]]", cached["albums"])}

        try:
            playlists = youtube_service.get_channel_playlists(
                channel_id, limit=settings.ARTIST_CHANNEL_PLAYLIST_LIMIT
            )
        except Exception:
            logger.warning(
                "Failed to fetch channel playlists for %s",
                channel_id,
                exc_info=True,
            )
            playlists = []

        albums = ArtistService._channel_playlist_albums(playlists)
        known_ids = {song["id"] for album in albums for song in album["songs"]}
        singles = ArtistService._channel_singles(db, db_artist, channel_id, known_ids)
        if singles:
            albums.append(
                {
                    "id": None,
                    "name": "Singles",
                    "cover_image_url": None,
                    "songs": singles,
                }
            )

        for album in albums:
            if not album["cover_image_url"] and album["songs"]:
                album["cover_image_url"] = album["songs"][0]["thumbnail"] or None

        metadata["albums_cache"] = {"fetched_at": time.time(), "albums": albums}
        db_artist.channel_metadata = metadata
        db.commit()

        return {"albums": albums}

    @staticmethod
    def _channel_playlist_albums(
        playlists: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        def fetch_playlist(playlist: dict[str, Any]) -> dict[str, Any]:
            try:
                songs = youtube_service.get_playlist_songs(
                    playlist["id"], limit=settings.ARTIST_PLAYLIST_SONGS_LIMIT
                )
            except Exception:
                logger.warning(
                    "Failed to fetch playlist songs for %s",
                    playlist.get("id"),
                    exc_info=True,
                )
                songs = []
            return {
                **playlist,
                "cover_image_url": playlist.get("cover_image_url"),
                "songs": [ArtistService._channel_song(s) for s in songs],
            }

        if not playlists:
            return []
        with ThreadPoolExecutor(
            max_workers=min(settings.ARTIST_IMPORT_MAX_WORKERS, len(playlists))
        ) as pool:
            return list(pool.map(fetch_playlist, playlists))

    @staticmethod
    def _channel_singles(
        db: Session,
        db_artist: ArtistModel,
        channel_id: str,
        known_ids: set[str],
    ) -> list[dict[str, Any]]:
        uploads = ArtistService._cached_channel_uploads(
            db,
            db_artist,
            channel_id,
            limit=settings.ARTIST_UPLOADS_LIMIT,
        )
        singles: list[dict[str, Any]] = []
        for song in uploads:
            if song["id"] not in known_ids:
                singles.append(ArtistService._channel_song(song))
                known_ids.add(song["id"])
        for song in ArtistService._song_dicts(db_artist):
            if song["id"] == channel_id:
                continue
            if song["id"] not in known_ids:
                singles.append(song)
                known_ids.add(song["id"])
        return singles

    @staticmethod
    def toggle_follow(
        db: Session, *, artist_id: str, user: UserModel
    ) -> dict[str, Any]:
        db_artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)

        is_following = user in db_artist.followers
        if is_following:
            db_artist.followers.remove(user)
            db_artist.follower_count = max(0, (db_artist.follower_count or 0) - 1)
        else:
            db_artist.followers.append(user)
            db_artist.follower_count = (db_artist.follower_count or 0) + 1
        db.commit()
        return {
            "is_following": not is_following,
            "follower_count": db_artist.follower_count,
        }

    @staticmethod
    def enrich_artist(db: Session, artist_id: str) -> dict[str, Any] | None:
        db_artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
        if db_artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)
        if db_artist.enriched_at is not None:
            return ArtistService.serialize(db_artist, current_user_id=None)

        fields = ArtistEnricher.enrich(db_artist.name)
        if fields is None:
            db_artist.enriched_at = datetime.now(UTC)
            db.commit()
            return ArtistService.serialize(db_artist, current_user_id=None)

        for key, value in fields.items():
            if key == "external_ids":
                db_artist.external_ids = {
                    **dict(db_artist.external_ids or {}),
                    **value,
                }
            else:
                setattr(db_artist, key, value)
        db_artist.enriched_at = datetime.now(UTC)
        db.commit()
        return ArtistService.serialize(db_artist, current_user_id=None)
