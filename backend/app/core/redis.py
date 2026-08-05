from __future__ import annotations

import json
from typing import Any

import redis

from app.core.config import settings


class RedisClient:
    """Redis client with singleton pattern and cache operations."""

    _instance: RedisClient | None = None
    _client: redis.Redis | None = None

    def __new__(cls) -> RedisClient:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> RedisClient:
        """Get the singleton RedisClient instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def connect(self) -> redis.Redis:
        """Get or create the underlying Redis connection."""
        if self._client is None:
            self._client = redis.from_url(  # type: ignore[no-untyped-call]
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return self._client

    def close(self) -> None:
        """Close the Redis connection."""
        if self._client is not None:
            self._client.close()
            self._client = None

    @property
    def client(self) -> redis.Redis:
        """Get the underlying Redis client, connecting if needed."""
        return self.connect()

    def get(self, key: str) -> Any | None:  # noqa: ANN401
        """Get a cached value by key."""
        try:
            value: str | None = self.client.get(key)  # type: ignore[assignment]
        except (redis.ConnectionError, json.JSONDecodeError):
            return None
        else:
            if value is not None:
                return json.loads(value)
            return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> bool:  # noqa: ANN401
        """Set a cached value with optional TTL in seconds."""
        try:
            serialized = json.dumps(value)
            if ttl:
                self.client.setex(key, ttl, serialized)
            else:
                self.client.set(key, serialized)
        except (redis.ConnectionError, TypeError):
            return False
        else:
            return True

    def delete(self, key: str) -> bool:
        """Delete a cached key."""
        try:
            self.client.delete(key)
        except redis.ConnectionError:
            return False
        else:
            return True

    def exists(self, key: str) -> bool:
        """Check if a key exists."""
        try:
            return bool(self.client.exists(key))
        except redis.ConnectionError:
            return False

    def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern. Returns count of deleted keys."""
        try:
            keys = list(self.client.scan_iter(match=pattern))
        except redis.ConnectionError:
            return 0
        else:
            if keys:
                deleted = self.client.delete(*keys)
                return int(deleted)  # type: ignore[arg-type]
            return 0

    def incr(self, key: str) -> int:
        """Increment a counter."""
        try:
            result = self.client.incr(key)
            return int(result)  # type: ignore[arg-type]
        except redis.ConnectionError:
            return 0
        else:
            return result

    def set_hash(
        self, key: str, mapping: dict[str, Any], ttl: int | None = None
    ) -> bool:
        """Set a hash with optional TTL."""
        try:
            self.client.hset(
                key, mapping={k: json.dumps(v) for k, v in mapping.items()}
            )
            if ttl:
                self.client.expire(key, ttl)
        except (redis.ConnectionError, TypeError):
            return False
        else:
            return True

    def get_hash(self, key: str) -> dict[str, Any] | None:
        """Get all fields of a hash."""
        try:
            raw: dict[str, str] = self.client.hgetall(key)  # type: ignore[assignment]
        except (redis.ConnectionError, json.JSONDecodeError):
            return None
        else:
            if raw:
                return {k: json.loads(v) for k, v in raw.items()}
            return None


def get_redis() -> RedisClient:
    """Get the singleton RedisClient instance."""
    return RedisClient.get_instance()
