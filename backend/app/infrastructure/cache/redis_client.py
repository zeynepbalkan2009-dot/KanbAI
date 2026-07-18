from typing import Any, Optional
import json

from redis.asyncio import Redis, ConnectionPool

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

_pool: Optional[ConnectionPool] = None


def get_redis_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.redis_url,
            max_connections=50,
            decode_responses=True,
        )
    return _pool


async def get_redis() -> Redis:
    return Redis(connection_pool=get_redis_pool())


# ── Token blacklist ────────────────────────────────────────────────────────────

BLACKLIST_PREFIX = "blacklist:jti:"


async def blacklist_token(jti: str, ttl_seconds: int) -> None:
    async with Redis(connection_pool=get_redis_pool()) as r:
        await r.setex(f"{BLACKLIST_PREFIX}{jti}", ttl_seconds, "1")
    logger.info("token_blacklisted", jti=jti)


async def is_token_blacklisted(jti: str) -> bool:
    async with Redis(connection_pool=get_redis_pool()) as r:
        return await r.exists(f"{BLACKLIST_PREFIX}{jti}") == 1


# ── Generic cache ──────────────────────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    async with Redis(connection_pool=get_redis_pool()) as r:
        await r.setex(key, ttl, json.dumps(value, default=str))


async def cache_get(key: str) -> Any | None:
    async with Redis(connection_pool=get_redis_pool()) as r:
        raw = await r.get(key)
        return json.loads(raw) if raw else None


async def cache_delete(key: str) -> None:
    async with Redis(connection_pool=get_redis_pool()) as r:
        await r.delete(key)


# ── PubSub publish (WebSocket events) ─────────────────────────────────────────

CHANNEL_PREFIX = "ws:tenant:"


async def publish_event(tenant_id: str, event: dict) -> None:
    channel = f"{CHANNEL_PREFIX}{tenant_id}"
    async with Redis(connection_pool=get_redis_pool()) as r:
        await r.publish(channel, json.dumps(event, default=str))
    logger.debug("event_published", channel=channel, event_type=event.get("type"))
