import uuid
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.service import get_current_user, CurrentUser, require_role
from app.infrastructure.database.models import Device
from app.infrastructure.database.session import get_db
from app.core.exceptions import NotFoundError, ConflictError

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
    created_at: datetime
    model_config = {"from_attributes": True}


class DeviceCreate(BaseModel):
    device_uuid: str
    name: str
    location_label: Optional[str] = None


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

    device = Device(
        id=uuid.uuid4(),
        factory_id=uuid.UUID(current.tenant_id),
        device_uuid=body.device_uuid,
        name=body.name,
        location_label=body.location_label,
    )
    db.add(device)
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
        .values(last_seen_at=datetime.now(timezone.utc))
    )
    device.last_seen_at = datetime.now(timezone.utc)
    return device
