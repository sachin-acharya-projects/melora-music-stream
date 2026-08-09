import re

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser
from app.core.cache import invalidate_cache, rate_limiter
from app.core.config import settings
from app.schemas.cache import CacheInvalidateRequest

router = APIRouter()


def _normalize_key(scope: str, key: str) -> str:
    """Normalize an invalidation key the same way the cache tiers do."""
    if scope == "search":
        return re.sub(r"\s+", " ", key.strip().casefold())
    return key.strip()


@router.post("/invalidate")
def invalidate(
    data: CacheInvalidateRequest,
    current_user: CurrentUser,
) -> dict[str, str]:
    """Evict a single cached search/stream entry.

    Rate limited per user so a misbehaving client cannot hammer the cache
    layer. Each target key additionally gets a cooldown after invalidation so
    the underlying YouTube results are not re-fetched in a tight loop.
    """
    budget_key = f"inv:user:{current_user.id}"
    if not rate_limiter.allow(
        budget_key,
        settings.CACHE_INVALIDATE_LIMIT,
        settings.CACHE_INVALIDATE_WINDOW_SECONDS,
    ):
        raise HTTPException(
            status_code=429,
            detail="Too many cache refreshes. Try again later.",
        )

    key = _normalize_key(data.scope, data.key)
    cooldown_key = f"invcd:{data.scope}:{key}"
    if rate_limiter.blocked(cooldown_key, settings.CACHE_INVALIDATE_COOLDOWN_SECONDS):
        raise HTTPException(
            status_code=429,
            detail="This result was refreshed recently. Try again in a few minutes.",
        )

    rate_limiter.mark(cooldown_key)
    invalidate_cache(f"{data.scope}:{key}")

    return {"status": "invalidated", "scope": data.scope, "key": key}
