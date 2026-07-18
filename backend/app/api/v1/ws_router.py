from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.security import decode_access_token
from app.core.config import get_settings
from app.infrastructure.cache.redis_client import is_token_blacklisted
from app.infrastructure.messaging.websocket_manager import manager
from app.core.logging import get_logger

router = APIRouter(tags=["websocket"])
logger = get_logger(__name__)
settings = get_settings()


@router.websocket("/ws/{tenant_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    tenant_id: str,
    token: str = Query(...),
):
    """
    WebSocket endpoint.
    Connect: ws://host/ws/{tenant_id}?token=<access_token>

    Events received by client:
      {"type": "connection.established", ...}
      {"type": "inspection.processing", "inspection_id": "...", ...}
      {"type": "inspection.completed", "decision": "pass|fail|review", ...}
      {"type": "inspection.error", "error": "...", ...}
    """
    # Authenticate before accept
    try:
        payload = decode_access_token(token)
    except (JWTError, Exception):
        await websocket.close(code=4001, reason="Invalid token")
        return

    jti = payload.get("jti", "")
    if jti and await is_token_blacklisted(jti):
        await websocket.close(code=4001, reason="Token revoked")
        return

    # Tenant isolation check
    token_tenant = payload.get("tenant_id")
    if token_tenant != tenant_id:
        await websocket.close(code=4003, reason="Tenant mismatch")
        return

    user_id = payload["sub"]

    await manager.connect(websocket, tenant_id=tenant_id, user_id=user_id)
    logger.info("ws_client_connected", tenant_id=tenant_id, user_id=user_id)

    try:
        while True:
            # Keep connection alive — handle ping/pong
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket, tenant_id)
        logger.info("ws_client_disconnected", tenant_id=tenant_id, user_id=user_id)
    except Exception as e:
        logger.error("ws_error", tenant_id=tenant_id, error=str(e))
        await manager.disconnect(websocket, tenant_id)
