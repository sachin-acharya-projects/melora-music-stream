"""Disk-cached thumbnail proxy for Google-hosted artwork.

The frontend used to load song/album/artist thumbnails straight from Google's
image CDN, which rate-limits per-IP (HTTP 429) when a page fires dozens of
parallel image requests. This service proxies those images through the backend
and caches them on disk, so Google only sees one request per unique image and
the browser loads are served from the local backend instead.

Only allowlisted Google image hosts are accepted, so the endpoint cannot be
abused as an open proxy (SSRF guard). Upstream fetches are single-flight per
URL (a burst of identical requests results in one fetch) and globally throttled
by a semaphore so a big page load never floods Google with parallel requests.
"""

from __future__ import annotations

import hashlib
import logging
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_HOSTS = frozenset(
    {
        "yt3.googleusercontent.com",
        "yt4.googleusercontent.com",
        "lh3.googleusercontent.com",
        "lh5.googleusercontent.com",
        "yt3.ggpht.com",
        "yt4.ggpht.com",
        "lh3.ggpht.com",
        "i.ytimg.com",
    }
)

FETCH_TIMEOUT_SECONDS = 10
MAX_BYTES = 5 * 1024 * 1024
MAX_CONCURRENT_FETCHES = 4
NEGATIVE_TTL_SECONDS = 10 * 60
CACHE_CONTROL = "public, max-age=31536000, immutable"

_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}
_DEFAULT_EXTENSION = ".img"

_CACHE_DIR = Path(settings.CACHE_DIR) / "thumbnails"
_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def is_allowed_thumbnail_url(url: str) -> bool:
    """Return True for an https URL on one of the allowlisted Google hosts."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    return parsed.hostname in ALLOWED_HOSTS


def _content_type_from_extension(extension: str) -> str:
    for content_type, ext in _EXTENSIONS.items():
        if ext == extension:
            return content_type
    return "application/octet-stream"


class ThumbnailService:
    """Disk-cached, concurrency-guarded thumbnail proxy."""

    def __init__(self, cache_dir: Path | None = None) -> None:
        self._cache_dir = cache_dir or _CACHE_DIR
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._locks: dict[str, threading.Lock] = {}
        self._locks_guard = threading.Lock()
        self._semaphore = threading.Semaphore(MAX_CONCURRENT_FETCHES)

    @staticmethod
    def _key(url: str) -> str:
        return hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]

    def _lock_for(self, key: str) -> threading.Lock:
        with self._locks_guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._locks[key] = lock
            return lock

    def _cached(self, key: str) -> tuple[Path, str] | None:
        for path in self._cache_dir.glob(f"{key}.*"):
            if path.suffix in {".neg", ".tmp"}:
                continue
            if path.is_file() and path.stat().st_size > 0:
                return path, _content_type_from_extension(path.suffix)
        return None

    def _negative_marker(self, key: str) -> Path:
        return self._cache_dir / f"{key}.neg"

    def resolve(self, url: str) -> tuple[Path, str] | None:
        """Return ``(cached_file, content_type)`` for ``url``, fetching and
        storing it on a miss.

        Returns ``None`` when the upstream request failed (a negative result is
        briefly memoized so Google is not hammered on repeat loads).
        """
        if not is_allowed_thumbnail_url(url):
            raise ValueError(  # noqa: TRY003
                "thumbnail URL is not an allowed Google image host"
            )

        key = self._key(url)
        with self._lock_for(key):
            cached = self._cached(key)
            if cached is not None:
                return cached

            marker = self._negative_marker(key)
            if marker.exists():
                try:
                    failed_at = float(marker.read_text())
                except (OSError, ValueError):
                    failed_at = 0.0
                if time.monotonic() - failed_at < NEGATIVE_TTL_SECONDS:
                    return None
                marker.unlink(missing_ok=True)

            try:
                content_type, body = self._fetch(url)
            except Exception:
                logger.warning("thumbnail fetch failed for %s", url, exc_info=True)
                marker.write_text(str(time.monotonic()))
                return None

            if len(body) > MAX_BYTES or not body:
                logger.warning("thumbnail rejected for %s (size=%d)", url, len(body))
                return None
            return self._store(key, content_type, body)

    def _fetch(self, url: str) -> tuple[str, bytes]:
        with (
            self._semaphore,
            httpx.Client(
                timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=True
            ) as client,
        ):
            response = client.get(url, headers={"User-Agent": _USER_AGENT})
            response.raise_for_status()
            content_type = response.headers.get("content-type", "image/jpeg")
            body = response.content
        return content_type, body

    def _store(self, key: str, content_type: str, body: bytes) -> tuple[Path, str]:
        extension = _EXTENSIONS.get(
            content_type.split(";", 1)[0].strip().lower(), _DEFAULT_EXTENSION
        )
        path = self._cache_dir / f"{key}{extension}"
        tmp = self._cache_dir / f"{key}.tmp"
        tmp.write_bytes(body)
        tmp.replace(path)
        return path, content_type


thumbnail_service = ThumbnailService()
