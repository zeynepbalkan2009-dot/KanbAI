"""
Distributed WebSocket manager backed by Redis PubSub.

Architecture:
  - Each API pod holds its own local WebSocket connections in memory.
  - When any service publishes an event to Redis channel `ws:tenant:{id}`,
    ALL pods receive it and forward to their locally-connected sockets.
  - This makes the broadcast fan-out work correctly across multiple workers/pods.

Usage:
    # Connect (with auth)
    await manager.connect(ws, tenant_id="...", user_id="...", token="...")

    # Publish from anywhere (API, Celery worker via Redis directly)
    await publish_event(tenant_id, {"type": "inspection.completed", ...})
"""

import asyncio
import json
from collections import defaultdict
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

from app.infrastructure.cache.redis_client import get_redis_pool, CHANNEL_PREFIX
from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # tenant_id → list of (websocket, user_id)
        self._connections: dict[str, list[tuple[WebSocket, str]]] = defaultdict(list)
        self._listener_tasks: dict[str, asyncio.Task] = {}

    # ── Public API ──────────────────────────────────────────────────────────

    async def connect(
        self,
        websocket: WebSocket,
        tenant_id: str,
        user_id: str,
    ) -> None:
        await websocket.accept()
        self._connections[tenant_id].append((websocket, user_id))
        logger.info("ws_connected", tenant_id=tenant_id, user_id=user_id)

        # Start Redis listener for this tenant if not already running
        if tenant_id not in self._listener_tasks or self._listener_tasks[tenant_id].done():
            task = asyncio.create_task(self._redis_listener(tenant_id))
            self._listener_tasks[tenant_id] = task

        await self._send_direct(websocket, {
            "type": "connection.established",
            "tenant_id": tenant_id,
            "user_id": user_id,
        })

    async def disconnect(self, websocket: WebSocket, tenant_id: str) -> None:
        conns = self._connections.get(tenant_id, [])
        self._connections[tenant_id] = [(ws, uid) for ws, uid in conns if ws != websocket]
        logger.info("ws_disconnected", tenant_id=tenant_id, remaining=len(self._connections[tenant_id]))

    async def broadcast_local(self, tenant_id: str, message: dict) -> None:
        """Send to all local connections for this tenant (called by Redis listener)."""
        dead: list[tuple[WebSocket, str]] = []
        for ws, uid in list(self._connections.get(tenant_id, [])):
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.debug("ws_send_failed", user_id=uid, error=str(e))
                dead.append((ws, uid))
        for item in dead:
            try:
                self._connections[tenant_id].remove(item)
            except ValueError:
                pass

    # ── Redis listener ───────────────────────────────────────────────────────

    async def _redis_listener(self, tenant_id: str) -> None:
        channel = f"{CHANNEL_PREFIX}{tenant_id}"
        logger.info("redis_listener_started", channel=channel)
        try:
            redis = Redis(connection_pool=get_redis_pool())
            pubsub = redis.pubsub()
            await pubsub.subscribe(channel)
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    data = json.loads(message["data"])
                    await self.broadcast_local(tenant_id, data)
                except json.JSONDecodeError:
                    logger.warning("ws_invalid_json", channel=channel)
        except asyncio.CancelledError:
            logger.info("redis_listener_cancelled", channel=channel)
        except Exception as e:
            logger.error("redis_listener_error", channel=channel, error=str(e))
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await redis.aclose()
            except Exception:
                pass

    # ── Stats ────────────────────────────────────────────────────────────────

    def connection_count(self, tenant_id: Optional[str] = None) -> int:
        if tenant_id:
            return len(self._connections.get(tenant_id, []))
        return sum(len(v) for v in self._connections.values())

    # ── Internal helpers ─────────────────────────────────────────────────────

    @staticmethod
    async def _send_direct(websocket: WebSocket, message: dict) -> None:
        try:
            await websocket.send_json(message)
        except Exception:
            pass


# Singleton — shared across the application
manager = ConnectionManager()
