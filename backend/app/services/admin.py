from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException
from sqlalchemy import asc, desc, func, or_

from app.core.config import resolve_avatar_url, settings
from app.core.messages import Messages
from app.db.base import SessionLocal
from app.db.models.artist import ArtistModel
from app.db.models.listening_history import ListeningHistoryModel
from app.db.models.song import SongModel
from app.db.models.user import UserModel, UserRole
from app.schemas.admin import (
    ArtistUpdate,
    BatchArtistImportRequest,
    PlaylistImportRequest,
    SongImportRequest,
    SongUpdate,
    UserAdminUpdate,
)
from app.schemas.artist import YouTubeArtistImport
from app.schemas.song import Song
from app.services.artist import ArtistService
from app.services.auth import AuthService
from app.services.songs import SongService
from app.services.youtube import youtube_service
from app.services.youtube_artist import YouTubeArtistService
from app.services.youtube_channel import YouTubeChannelService

if TYPE_CHECKING:
    from sqlalchemy.orm import Query, Session

logger = logging.getLogger(__name__)

_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


class AdminService:
    """Catalog management and dashboard metrics for admins."""

    # ------------------------------------------------------------------ #
    # Dashboard
    # ------------------------------------------------------------------ #
    @staticmethod
    def dashboard(db: Session) -> dict[str, Any]:
        now = datetime.now(UTC).replace(tzinfo=None)
        since = now - timedelta(days=30)

        def count(model: type[Any], *criteria: Any) -> int:
            query = db.query(func.count(model.id))
            if criteria:
                query = query.filter(*criteria)
            return int(query.scalar() or 0)

        artists_total = count(ArtistModel)
        songs_total = count(SongModel)
        return {
            "artists_total": artists_total,
            "artists_published": count(
                ArtistModel, ArtistModel.is_published.is_(True)
            ),
            "artists_hidden": count(
                ArtistModel, ArtistModel.is_published.is_(False)
            ),
            "artists_featured": count(ArtistModel, ArtistModel.is_featured.is_(True)),
            "songs_total": songs_total,
            "songs_published": count(SongModel, SongModel.is_published.is_(True)),
            "songs_hidden": count(SongModel, SongModel.is_published.is_(False)),
            "songs_featured": count(SongModel, SongModel.is_featured.is_(True)),
            "users_total": count(UserModel),
            "active_users": count(UserModel, UserModel.is_active.is_(True)),
            "total_plays": count(ListeningHistoryModel),
            "plays_last_30_days": count(
                ListeningHistoryModel, ListeningHistoryModel.played_at >= since
            ),
        }

    # ------------------------------------------------------------------ #
    # Artists
    # ------------------------------------------------------------------ #
    @staticmethod
    def list_artists(
        db: Session,
        *,
        search: str | None = None,
        sort_by: str = "created_at",
        order: str = "desc",
        page: int = 1,
        page_size: int = 50,
        source: str | None = None,
        published: bool | None = None,
    ) -> dict[str, Any]:
        query = db.query(ArtistModel)
        if search:
            query = query.filter(ArtistModel.name.ilike(f"%{search}%"))
        if source == "youtube":
            query = query.filter(
                ArtistModel.external_ids["youtube_channel_id"].as_string().isnot(None)
            )
        elif source == "platform":
            query = query.filter(
                ArtistModel.external_ids["youtube_channel_id"].as_string().is_(None)
            )
        if published is True:
            query = query.filter(ArtistModel.is_published.is_(True))
        elif published is False:
            query = query.filter(ArtistModel.is_published.is_(False))

        sort_col = getattr(ArtistModel, sort_by, ArtistModel.created_at)
        order_func = asc if order == "asc" else desc
        total = query.count()
        items = (
            query.order_by(order_func(sort_col))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "items": [
                ArtistService.serialize(artist, current_user_id=None)
                for artist in items
            ],
        }

    @staticmethod
    def update_artist(db: Session, artist_id: str, update: ArtistUpdate) -> dict[str, Any]:
        artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
        if artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)
        if update.name is not None:
            artist.name = update.name.strip()
        if update.bio is not None:
            artist.bio = update.bio
        if update.genres is not None:
            artist.genres = [genre for genre in update.genres if genre]
        if update.thumbnail_url is not None:
            artist.thumbnail_url = update.thumbnail_url
        db.commit()
        db.refresh(artist)
        return ArtistService.serialize(artist, current_user_id=None)

    @staticmethod
    def set_artist_featured(
        db: Session, artist_id: str, *, featured: bool
    ) -> dict[str, Any]:
        artist = AdminService._get_artist(db, artist_id)
        artist.is_featured = featured
        db.commit()
        db.refresh(artist)
        return ArtistService.serialize(artist, current_user_id=None)

    @staticmethod
    def set_artist_published(
        db: Session, artist_id: str, *, published: bool
    ) -> dict[str, Any]:
        artist = AdminService._get_artist(db, artist_id)
        artist.is_published = published
        db.commit()
        db.refresh(artist)
        return ArtistService.serialize(artist, current_user_id=None)

    @staticmethod
    def delete_artist(db: Session, artist_id: str) -> dict[str, Any]:
        artist = AdminService._get_artist(db, artist_id)
        db.delete(artist)
        db.commit()
        return {"id": artist_id, "deleted": True}

    @staticmethod
    def batch_import_artists(
        items: list[str], *, thumbnail: str | None = None
    ) -> list[dict[str, Any]]:
        """Import several artists from names, channel ids, or channel URLs.

        Runs in a thread pool (one DB session per item) because each import
        makes several YouTube calls; SQLite WAL keeps concurrent sessions safe.
        """
        workers = min(settings.ARTIST_IMPORT_MAX_WORKERS, len(items))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(
                pool.map(
                    lambda item: AdminService._import_one_artist(
                        item, thumbnail=thumbnail
                    ),
                    items,
                )
            )
        return results

    @staticmethod
    def _import_one_artist(
        item: str, *, thumbnail: str | None
    ) -> dict[str, Any]:
        db = SessionLocal()
        try:
            channel_id, name = AdminService._resolve_channel(item)
            if not channel_id:
                return {
                    "input": item,
                    "status": "failed",
                    "message": "Could not resolve the artist on YouTube",
                }
            existing = YouTubeChannelService.find_by_channel_id(db, channel_id)
            if existing is not None:
                return {
                    "input": item,
                    "status": "already_exists",
                    "name": existing.name,
                    "channel_id": channel_id,
                }
            YouTubeArtistService.import_artist(
                db,
                YouTubeArtistImport(channel_id=channel_id, name=name, thumbnail=thumbnail),
            )
            return {
                "input": item,
                "status": "imported",
                "name": name,
                "channel_id": channel_id,
            }
        except Exception:
            logger.warning("Batch artist import failed for %r", item, exc_info=True)
            return {"input": item, "status": "failed", "message": "Import failed"}
        finally:
            db.close()

    @staticmethod
    def _resolve_channel(item: str) -> tuple[str | None, str]:
        """Map an artist input (name, channel id, or URL) to (channel_id, name)."""
        text = item.strip()
        if not text:
            return None, ""

        channel_id = YouTubeChannelService.normalize_channel_id(text)
        if channel_id:
            name = ""
            try:
                metadata = youtube_service.get_channel_metadata(channel_id)
                name = metadata.get("name") or ""
            except Exception:
                logger.warning(
                    "Failed to resolve channel name for %s", channel_id, exc_info=True
                )
            if name:
                return channel_id, name
            return None, ""

        query = text
        if "youtube.com" in query:
            handle = re.search(r"@([^/\s]+)", query)
            if handle:
                query = handle.group(1)
            else:
                channel_match = re.search(r"/channel/([^/\s]+)", query)
                if channel_match:
                    query = channel_match.group(1)
        try:
            channels = youtube_service.search_artists(query, limit=1)
        except Exception:
            logger.warning("Artist search failed for %r", query, exc_info=True)
            return None, ""
        if not channels:
            return None, ""
        return channels[0].get("channel_id"), channels[0].get("name") or "Unknown Artist"

    @staticmethod
    def _get_artist(db: Session, artist_id: str) -> ArtistModel:
        artist = db.query(ArtistModel).filter(ArtistModel.id == artist_id).first()
        if artist is None:
            raise HTTPException(status_code=404, detail=Messages.ARTIST_NOT_FOUND)
        return artist

    # ------------------------------------------------------------------ #
    # Songs
    # ------------------------------------------------------------------ #
    @staticmethod
    def list_songs(
        db: Session,
        *,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
        published: bool | None = None,
    ) -> dict[str, Any]:
        query: Query[SongModel] = db.query(SongModel)
        if search:
            query = query.filter(
                or_(
                    SongModel.title.ilike(f"%{search}%"),
                    SongModel.uploader.ilike(f"%{search}%"),
                )
            )
        if published is True:
            query = query.filter(SongModel.is_published.is_(True))
        elif published is False:
            query = query.filter(SongModel.is_published.is_(False))
        total = query.count()
        items = (
            query.order_by(SongModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "items": [SongService.serialize(song) for song in items],
        }

    @staticmethod
    def import_song(db: Session, data: SongImportRequest) -> dict[str, Any]:
        video_id = AdminService._extract_video_id(data.url)
        if not video_id:
            raise HTTPException(status_code=400, detail=Messages.INVALID_YOUTUBE_VIDEO)
        try:
            resolved = youtube_service.extract_playlist_info(
                f"https://www.youtube.com/watch?v={video_id}"
            )
        except Exception:
            logger.warning("Song import extraction failed for %s", video_id, exc_info=True)
            raise HTTPException(
                status_code=502, detail=Messages.COULD_NOT_RESOLVE_SONG
            ) from None
        if not resolved:
            raise HTTPException(status_code=400, detail=Messages.COULD_NOT_RESOLVE_SONG)
        data_item = resolved[0]
        db_song = SongService.upsert_song(
            db,
            Song(
                id=data_item["id"],
                title=data_item.get("title") or "Unknown Title",
                uploader=data_item.get("uploader") or "Unknown Artist",
                thumbnail=data_item.get("thumbnail") or "",
                duration=data_item.get("duration") or 0,
            ),
        )
        ArtistService.sync_song_artists(db, db_song)
        db.refresh(db_song)
        return {**SongService.serialize(db_song), "imported": True}

    @staticmethod
    def update_song(db: Session, song_id: str, update: SongUpdate) -> dict[str, Any]:
        song = AdminService._get_song(db, song_id)
        if update.title is not None:
            song.title = update.title
        if update.uploader is not None:
            song.uploader = update.uploader
        if update.thumbnail is not None:
            song.thumbnail = update.thumbnail
        db.commit()
        db.refresh(song)
        return SongService.serialize(song)

    @staticmethod
    def set_song_featured(db: Session, song_id: str, *, featured: bool) -> dict[str, Any]:
        song = AdminService._get_song(db, song_id)
        song.is_featured = featured
        db.commit()
        db.refresh(song)
        return SongService.serialize(song)

    @staticmethod
    def set_song_published(db: Session, song_id: str, *, published: bool) -> dict[str, Any]:
        song = AdminService._get_song(db, song_id)
        song.is_published = published
        db.commit()
        db.refresh(song)
        return SongService.serialize(song)

    @staticmethod
    def delete_song(db: Session, song_id: str) -> dict[str, Any]:
        song = AdminService._get_song(db, song_id)
        db.delete(song)
        db.commit()
        return {"id": song_id, "deleted": True}

    @staticmethod
    def _get_song(db: Session, song_id: str) -> SongModel:
        song = db.query(SongModel).filter(SongModel.id == song_id).first()
        if song is None:
            raise HTTPException(status_code=404, detail=Messages.SONG_NOT_FOUND)
        return song

    @staticmethod
    def _extract_video_id(value: str) -> str | None:
        text = value.strip()
        if _VIDEO_ID_RE.fullmatch(text):
            return text
        patterns = (
            r"youtu\.be/([A-Za-z0-9_-]{11})",
            r"[?&]v=([A-Za-z0-9_-]{11})",
            r"/watch\?v=([A-Za-z0-9_-]{11})",
        )
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None

    # ------------------------------------------------------------------ #
    # Playlist -> catalog import
    # ------------------------------------------------------------------ #
    @staticmethod
    def import_playlist(db: Session, data: PlaylistImportRequest) -> dict[str, Any]:
        try:
            songs_data = youtube_service.extract_playlist_info(data.url)
        except Exception:
            logger.warning("Playlist import extraction failed", exc_info=True)
            raise HTTPException(status_code=502, detail=Messages.PLAYLIST_IMPORT_FAILED) from None
        if not songs_data:
            raise HTTPException(status_code=400, detail=Messages.PLAYLIST_IMPORT_FAILED)

        total = len(songs_data)
        imported = 0
        skipped = 0
        failed = 0
        for item in songs_data:
            song_id = item.get("id")
            if not song_id:
                failed += 1
                continue
            exists = (
                db.query(SongModel).filter(SongModel.id == song_id).first() is not None
            )
            if exists:
                skipped += 1
                continue
            try:
                db_song = SongService.upsert_song(
                    db,
                    Song(
                        id=song_id,
                        title=item.get("title") or "Unknown Title",
                        uploader=item.get("uploader") or "Unknown Artist",
                        thumbnail=item.get("thumbnail") or "",
                        duration=item.get("duration") or 0,
                    ),
                )
                ArtistService.sync_song_artists(db, db_song)
                imported += 1
            except Exception:
                db.rollback()
                logger.warning("Playlist import song failed for %s", song_id, exc_info=True)
                failed += 1
        return {
            "total": total,
            "imported": imported,
            "skipped_existing": skipped,
            "failed": failed,
        }

    # ------------------------------------------------------------------ #
    # Users
    # ------------------------------------------------------------------ #
    @staticmethod
    def list_users(
        db: Session,
        *,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        query = db.query(UserModel)
        if search:
            query = query.filter(
                or_(
                    UserModel.email.ilike(f"%{search}%"),
                    UserModel.username.ilike(f"%{search}%"),
                    UserModel.display_name.ilike(f"%{search}%"),
                )
            )
        total = query.count()
        users = (
            query.order_by(UserModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "items": [AdminService._serialize_user(user) for user in users],
        }

    @staticmethod
    def update_user(
        db: Session, user_id: str, update: UserAdminUpdate, *, acting_user: UserModel
    ) -> dict[str, Any]:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=404, detail=Messages.USER_NOT_FOUND)

        if update.role is not None:
            if update.role not in (UserRole.ADMIN.value, UserRole.USER.value):
                raise HTTPException(status_code=400, detail=Messages.INVALID_ROLE)
            if user.id == acting_user.id and update.role != UserRole.ADMIN.value:
                raise HTTPException(status_code=400, detail=Messages.CANNOT_DEMOTE_SELF)
        if update.is_active is not None:
            if user.id == acting_user.id and not update.is_active:
                raise HTTPException(
                    status_code=400, detail=Messages.CANNOT_DEACTIVATE_SELF
                )

        # Only the super admin (ROOT_ADMIN_EMAIL) may change another admin's
        # account. Regular admins can still promote users to admin and manage
        # regular accounts, but admin accounts are off-limits to them.
        if user.role == UserRole.ADMIN.value and not AuthService.is_super_admin(
            acting_user
        ):
            raise HTTPException(
                status_code=403, detail=Messages.ADMIN_ACCOUNT_CHANGE_RESTRICTED
            )

        if update.role is not None:
            user.role = update.role
        if update.is_active is not None:
            user.is_active = update.is_active
        db.commit()
        db.refresh(user)
        return AdminService._serialize_user(user)

    @staticmethod
    def _serialize_user(user: UserModel) -> dict[str, Any]:
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "display_name": user.display_name,
            "avatar_url": resolve_avatar_url(user.avatar_url),
            "role": user.role,
            "is_active": user.is_active,
            "is_super_admin": AuthService.is_super_admin(user),
            "created_at": user.created_at.isoformat()
            if user.created_at is not None
            else None,
        }
