"""Shared cache helpers and an in-process rate limiter.

Search and stream results are cached in Redis (shared across workers) with an
in-process TTL LRU as the fast tier. When Redis is unavailable every read falls
back to the loader and every write is skipped, so the app keeps working.

The rate limiter is in-memory only, which is correct for the single-instance
deployment this app targets (SQLite, one FastAPI worker). A multi-worker setup
would need the counters moved into Redis.
"""

from __future__ import annotations

import logging
import time
from collections import OrderedDict
from typing import TYPE_CHECKING, Any

from app.core.redis import get_redis

if TYPE_CHECKING:
    from collections.abc import Callable

logger = logging.getLogger(__name__)

MAX_MEMORY_ENTRIES = 1000


class TTLMemoryCache:
    """A tiny LRU cache with optional per-entry TTLs (thread-safe enough for
    the GIL; ordering bookkeeping happens in a single lock-free pass)."""

    def __init__(self, max_entries: int = MAX_MEMORY_ENTRIES) -> None:
        self._data: OrderedDict[str, tuple[float | None, Any]] = OrderedDict()
        self._max_entries = max_entries

    def get(self, key: str) -> Any:  # noqa: ANN401
        item = self._data.get(key)
        if item is None:
            return None
        expires_at, value = item
        if expires_at is not None and expires_at < time.monotonic():
            self._data.pop(key, None)
            return None
        self._data.move_to_end(key)
        return value

    def set(
        self,
        key: str,
        value: Any,  # noqa: ANN401
        ttl: int | None = None,
    ) -> None:
        expires_at = time.monotonic() + ttl if ttl is not None else None
        self._data[key] = (expires_at, value)
        self._data.move_to_end(key)
        if len(self._data) > self._max_entries:
            self._data.popitem(last=False)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def clear(self) -> None:
        self._data.clear()


memory_cache = TTLMemoryCache()


def cache_get_or_set[T](
    key: str,
    ttl: int | None,
    loader: Callable[[], T],
    *,
    cache_falsy: bool = False,
) -> tuple[T, bool]:
    """Return ``(value, served_from_cache)``.

    Reads the in-memory tier first, then Redis, then runs ``loader`` and stores
    the result in both tiers. Falsy results (e.g. an empty search) are only
    stored when ``cache_falsy`` is set, so a query that currently has no
    results can pick up newly uploaded songs later.
    """
    cached = memory_cache.get(key)
    if cached is not None:
        logger.info("[cache] hit (memory) for %s", key)
        return cached, True

    cached = get_redis().get(key)
    if cached is not None:
        logger.info("[cache] hit (redis) for %s", key)
        memory_cache.set(key, cached, ttl)
        return cached, True

    logger.info("[cache] miss for %s", key)
    value = loader()
    if value is not None and (cache_falsy or value):
        memory_cache.set(key, value, ttl)
        get_redis().set(key, value, ttl)
    return value, False


def invalidate_cache(key: str) -> None:
    """Evict ``key`` from both cache tiers."""
    memory_cache.delete(key)
    get_redis().delete(key)


class MemoryRateLimiter:
    """Fixed-window per-key rate limiter kept in-process.

    ``allow`` bumps the counter for ``key`` and returns whether the request is
    still inside ``limit`` for the rolling ``window``. ``mark`` stamps a key so
    that ``blocked`` reports True for the next ``ttl`` seconds (used for the
    per-target invalidation cooldown).
    """

    def __init__(self) -> None:
        self._entries: dict[str, tuple[float, int]] = {}

    def allow(self, key: str, limit: int, window: float) -> bool:
        now = time.monotonic()
        entry = self._entries.get(key)
        if entry is None or now - entry[0] >= window:
            self._entries[key] = (now, 1)
            return True
        count = entry[1] + 1
        self._entries[key] = (entry[0], count)
        return count <= limit

    def mark(self, key: str) -> None:
        self._entries[key] = (time.monotonic(), 1)

    def blocked(self, key: str, ttl: float) -> bool:
        now = time.monotonic()
        entry = self._entries.get(key)
        return entry is not None and now - entry[0] < ttl

    def clear(self) -> None:
        self._entries.clear()


rate_limiter = MemoryRateLimiter()
