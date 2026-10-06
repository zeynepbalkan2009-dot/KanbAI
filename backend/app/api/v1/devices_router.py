import hashlib
import secrets
import uuid
from typing import Optional
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.service import get_current_user, CurrentUser, require_role
from app.infrastructure.database.models import Device, DeviceActivationToken, Station, EdgeSyncEvent
from app.infrastructure.database.session import get_db
from app.core.exceptions import NotFoundError, ConflictError, UnauthorizedError, ValidationError
from app.core.config import get_settings
from app.core.edge_security import issue_device_token, verify_device_token, sha256_json

settings = get_settings()

router = APIRouter(prefix="/devices", tags=["devices"])


class DeviceOut(BaseModel):
    id: uuid.UUID
    factory_id: uuid.UUID
    device_uuid: str
    name: str
    location_label: Optional[str]
    is_active: bool
    last_seen_at: Optional[datetime]
    firmware_version: Optional[str]
    status: str = "pending"
    station_id: Optional[uuid.UUID] = None
    activated_at: Optional[datetime] = None
    device_credential: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class DeviceCreate(BaseModel):
    device_uuid: str
    name: str
    location_label: Optional[str] = None
    station_id: Optional[uuid.UUID] = None


class ActivationTokenCreate(BaseModel):
    station_id: Optional[uuid.UUID] = None
    label: Optional[str] = None
    expires_in_hours: int = 24


class ActivationTokenOut(BaseModel):
    activation_token: str
    expires_at: datetime
    station_id: Optional[uuid.UUID] = None


class EdgeSyncEventIn(BaseModel):
    event_id: str
    event_type: str
    payload: dict


class EdgeSyncBatchIn(BaseModel):
    events: list[EdgeSyncEventIn]


class EdgeSyncAck(BaseModel):
    accepted: list[str]
    duplicates: list[str]


class DeviceActivateIn(BaseModel):
    activation_token: str
    device_uuid: str
    name: str
    firmware_version: Optional[str] = None
    location_label: Optional[str] = None


class HeartbeatIn(BaseModel):
    status: str = "online"
    battery_level: Optional[int] = None
    firmware_version: Optional[str] = None
    telemetry: dict = {}


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.get("", response_model=list[DeviceOut])
async def list_devices(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_uuid = uuid.UUID(current.tenant_id)
    result = await db.execute(
        select(Device).where(
            Device.factory_id == tenant_uuid,
            Device.deleted_at.is_(None),
        ).order_by(Device.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=DeviceOut, status_code=201)
async def register_device(
    body: DeviceCreate,
    current: CurrentUser = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate device_uuid globally
    existing = await db.execute(
        select(Device).where(Device.device_uuid == body.device_uuid)
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Device UUID already registered")

    raw_device_token, device_token_hash = issue_device_token()
    device = Device(
        id=uuid.uuid4(),
        factory_id=uuid.UUID(current.tenant_id),
        device_uuid=body.device_uuid,
        name=body.name,
        location_label=body.location_label,
        station_id=body.station_id,
        status="active",
        activated_at=datetime.now(timezone.utc),
        device_credential_hash=device_token_hash,
        credential_issued_at=datetime.now(timezone.utc),
    )
    db.add(device)
    await db.flush()
    result = DeviceOut.model_validate(device)
    result.device_credential = raw_device_token
    return result


@router.post("/activation-token", response_model=ActivationTokenOut, status_code=201)
async def create_activation_token(
    body: ActivationTokenCreate,
    current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager")),
    db: AsyncSession = Depends(get_db),
):
    tenant_uuid = uuid.UUID(current.tenant_id)
    if body.station_id:
        station = await db.get(Station, body.station_id)
        if not station or station.factory_id != tenant_uuid:
            raise NotFoundError("Station")
    raw_token = f"kanbai_{secrets.token_urlsafe(24)}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=max(1, min(body.expires_in_hours, 168)))
    token = DeviceActivationToken(
        id=uuid.uuid4(),
        factory_id=tenant_uuid,
        station_id=body.station_id,
        token_hash=_hash_token(raw_token),
        label=body.label,
        created_by=uuid.UUID(current.user_id),
        expires_at=expires_at,
    )
    db.add(token)
    await db.flush()
    return ActivationTokenOut(activation_token=raw_token, expires_at=expires_at, station_id=body.station_id)


@router.post("/activate", response_model=DeviceOut, status_code=201)
async def activate_device(body: DeviceActivateIn, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(DeviceActivationToken).where(
            DeviceActivationToken.token_hash == _hash_token(body.activation_token),
            DeviceActivationToken.used_at.is_(None),
            DeviceActivationToken.revoked_at.is_(None),
        )
    )
    token = result.scalar_one_or_none()
    if not token or token.expires_at < now:
        from app.core.exceptions import UnauthorizedError
        raise UnauthorizedError("Invalid or expired activation token")

    existing = await db.execute(select(Device).where(Device.device_uuid == body.device_uuid))
    device = existing.scalar_one_or_none()
    if device and device.factory_id != token.factory_id:
        raise ConflictError("Device UUID already registered for another factory")
    raw_device_token, device_token_hash = issue_device_token()
    if not device:
        device = Device(
            id=uuid.uuid4(),
            factory_id=token.factory_id,
            device_uuid=body.device_uuid,
            name=body.name,
            location_label=body.location_label,
            station_id=token.station_id,
            device_credential_hash=device_token_hash,
            credential_issued_at=now,
        )
        db.add(device)
    else:
        device.device_credential_hash = device_token_hash
        device.credential_issued_at = now
        device.credential_revoked_at = None
    device.name = body.name
    device.location_label = body.location_label or device.location_label
    device.station_id = token.station_id or device.station_id
    device.firmware_version = body.firmware_version
    device.status = "active"
    device.is_active = True
    device.activated_at = now
    device.last_seen_at = now
    token.used_at = now
    token.used_by_device_id = device.id
    await db.flush()
    return device


@router.post("/{device_id}/sync", response_model=EdgeSyncAck)
async def sync_device_events(
    device_id: str,
    body: EdgeSyncBatchIn,
    x_kanbai_device_token: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Authenticated, idempotent Edge -> Cloud event ingress."""
    if not settings.edge_sync_enabled:
        raise ValidationError("Edge sync is disabled")
    if len(body.events) > settings.edge_sync_batch_max:
        raise ValidationError("Sync batch exceeds configured maximum")

    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError as exc:
        raise ValidationError("Invalid device id") from exc

    device = await db.get(Device, device_uuid)
    if not device or not device.is_active or device.status == "revoked":
        raise UnauthorizedError("Device is inactive or revoked")

    if settings.edge_device_auth_enabled:
        if not x_kanbai_device_token or not device.device_credential_hash:
            raise UnauthorizedError("Device credential required")
        if device.credential_revoked_at is not None:
            raise UnauthorizedError("Device credential revoked")
        if not verify_device_token(x_kanbai_device_token, device.device_credential_hash):
            raise UnauthorizedError("Invalid device credential")

    accepted: list[str] = []
    duplicates: list[str] = []
    now = datetime.now(timezone.utc)

    for event in body.events:
        if len(event.event_id) > 120 or len(event.event_type) > 80:
            raise ValidationError("Edge event id or type is too long")
        payload_size = len(event.model_dump_json().encode("utf-8"))
        if payload_size > settings.edge_event_max_payload_bytes:
            raise ValidationError("Edge event payload exceeds configured maximum")

        existing = await db.execute(
            select(EdgeSyncEvent).where(
                EdgeSyncEvent.factory_id == device.factory_id,
                EdgeSyncEvent.event_id == event.event_id,
            )
        )
        if existing.scalar_one_or_none():
            duplicates.append(event.event_id)
            continue

        db.add(EdgeSyncEvent(
            id=uuid.uuid4(),
            factory_id=device.factory_id,
            device_id=device.id,
            event_id=event.event_id,
            event_type=event.event_type,
            payload=event.payload,
            payload_sha256=sha256_json(event.payload),
            status="received",
            attempts=0,
            available_at=now,
        ))
        accepted.append(event.event_id)

    device.last_seen_at = now
    device.status = "online"
    await db.flush()
    return EdgeSyncAck(accepted=accepted, duplicates=duplicates)


@router.post("/{device_id}/heartbeat", response_model=DeviceOut)
async def post_device_heartbeat(
    device_id: str,
    body: HeartbeatIn,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device_uuid = uuid.UUID(device_id)
    tenant_uuid = uuid.UUID(current.tenant_id)
    result = await db.execute(select(Device).where(Device.id == device_uuid, Device.factory_id == tenant_uuid))
    device = result.scalar_one_or_none()
    if not device:
        raise NotFoundError("Device")
    metadata = dict(device.metadata_json or {})
    metadata.update({"battery_level": body.battery_level, "telemetry": body.telemetry})
    device.last_seen_at = datetime.now(timezone.utc)
    device.status = body.status
    device.firmware_version = body.firmware_version or device.firmware_version
    device.metadata_json = metadata
    await db.flush()
    return device


@router.post("/{device_id}/revoke", response_model=DeviceOut)
async def revoke_device(
    device_id: str,
    current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager")),
    db: AsyncSession = Depends(get_db),
):
    tenant_uuid = uuid.UUID(current.tenant_id)
    device = await db.get(Device, uuid.UUID(device_id))
    if not device or device.factory_id != tenant_uuid:
        raise NotFoundError("Device")
    device.is_active = False
    device.status = "revoked"
    device.revoked_at = datetime.now(timezone.utc)
    await db.flush()
    return device


@router.patch("/{device_id}/heartbeat", response_model=DeviceOut)
async def device_heartbeat(
    device_id: str,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mobile app calls this periodically to update last_seen_at."""
    device_uuid = uuid.UUID(device_id)
    tenant_uuid = uuid.UUID(current.tenant_id)
    result = await db.execute(
        select(Device).where(
            Device.id == device_uuid,
            Device.factory_id == tenant_uuid,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise NotFoundError("Device")

    await db.execute(
        update(Device)
        .where(Device.id == device_uuid)
        .values(last_seen_at=datetime.now(timezone.utc), status="online")
    )
    device.last_seen_at = datetime.now(timezone.utc)
    device.status = "online"
    return device
