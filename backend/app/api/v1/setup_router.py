import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.domains.auth.service import CurrentUser, get_current_user, require_role
from app.infrastructure.database.models import ProductionLine, Product, Shift, Station
from app.infrastructure.database.session import get_db

router = APIRouter(tags=["factory-setup"])

ADMIN_ROLES = ("admin", "manager", "quality_manager")
MODEL_BY_RESOURCE = {
    "production-lines": ProductionLine,
    "stations": Station,
    "products": Product,
    "shifts": Shift,
}


class ProductionLineCreate(BaseModel):
    name: str
    code: str
    status: str = "active"
    metadata: dict[str, Any] = Field(default_factory=dict)


class StationCreate(BaseModel):
    name: str
    code: str
    production_line_id: Optional[uuid.UUID] = None
    station_type: str = "visual_inspection"
    status: str = "active"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProductCreate(BaseModel):
    sku: str
    name: str
    revision: Optional[str] = None
    defect_policy: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class ProductInspectionProfileUpdate(BaseModel):
    industry_domain: Literal["steel_equipment", "battery_assembly"]
    operation_stage: str = Field(min_length=2, max_length=120)
    inspection_mode: Literal["visual_defect", "assembly_presence", "dimensional_assist", "data_collection"]
    capture_mode: Literal["conveyor", "fixed_station", "handheld"] = "fixed_station"
    capture_strategy: Literal["manual", "stability_gated", "external_trigger", "continuous"] = "manual"
    native_camera_required: bool = False
    alignment_overlay_required: bool = True
    defect_classes: list[str] = Field(default_factory=list, max_length=20)
    human_review_required: bool = True
    quality_decision_enabled: bool = False


class ShiftCreate(BaseModel):
    name: str
    starts_at: str = Field(pattern=r"^\d{2}:\d{2}$")
    ends_at: str = Field(pattern=r"^\d{2}:\d{2}$")
    is_active: bool = True


class ResourceOut(BaseModel):
    id: uuid.UUID
    factory_id: uuid.UUID
    name: str
    code: Optional[str] = None
    sku: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


def _as_out(item: Any) -> dict[str, Any]:
    payload = {
        "id": item.id,
        "factory_id": item.factory_id,
        "name": item.name,
        "code": getattr(item, "code", None),
        "sku": getattr(item, "sku", None),
        "status": getattr(item, "status", None),
        "created_at": item.created_at,
    }
    if isinstance(item, Product):
        payload.update(
            {
                "revision": item.revision,
                "defect_policy": item.defect_policy or {},
                "is_active": item.is_active,
            }
        )
    return payload


async def _list(model: Any, current: CurrentUser, db: AsyncSession, active_only: bool):
    q = select(model).where(model.factory_id == uuid.UUID(current.tenant_id), model.deleted_at.is_(None))
    if active_only:
        if hasattr(model, "is_active"):
            q = q.where(model.is_active.is_(True))
        elif hasattr(model, "status"):
            q = q.where(model.status == "active")
    result = await db.execute(q.order_by(model.created_at.desc()))
    return [_as_out(row) for row in result.scalars().all()]


async def _ensure_unique(db: AsyncSession, model: Any, tenant_id: str, field: str, value: str):
    existing = await db.execute(
        select(model).where(
            model.factory_id == uuid.UUID(tenant_id),
            getattr(model, field) == value,
            model.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError(f"{model.__tablename__} with this {field} already exists")


@router.get("/production-lines")
async def list_production_lines(active_only: bool = Query(False), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _list(ProductionLine, current, db, active_only)


@router.post("/production-lines", status_code=201)
async def create_production_line(body: ProductionLineCreate, current: CurrentUser = Depends(require_role(*ADMIN_ROLES)), db: AsyncSession = Depends(get_db)):
    await _ensure_unique(db, ProductionLine, current.tenant_id, "code", body.code)
    item = ProductionLine(id=uuid.uuid4(), factory_id=uuid.UUID(current.tenant_id), name=body.name, code=body.code, status=body.status, metadata_json=body.metadata)
    db.add(item)
    await db.flush()
    return _as_out(item)


@router.get("/stations")
async def list_stations(active_only: bool = Query(False), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _list(Station, current, db, active_only)


@router.post("/stations", status_code=201)
async def create_station(body: StationCreate, current: CurrentUser = Depends(require_role(*ADMIN_ROLES)), db: AsyncSession = Depends(get_db)):
    await _ensure_unique(db, Station, current.tenant_id, "code", body.code)
    if body.production_line_id:
        line = await db.get(ProductionLine, body.production_line_id)
        if not line or str(line.factory_id) != current.tenant_id:
            raise NotFoundError("Production line")
    item = Station(id=uuid.uuid4(), factory_id=uuid.UUID(current.tenant_id), production_line_id=body.production_line_id, name=body.name, code=body.code, station_type=body.station_type, status=body.status, metadata_json=body.metadata)
    db.add(item)
    await db.flush()
    return _as_out(item)


@router.get("/products")
async def list_products(active_only: bool = Query(False), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _list(Product, current, db, active_only)


@router.post("/products", status_code=201)
async def create_product(body: ProductCreate, current: CurrentUser = Depends(require_role(*ADMIN_ROLES)), db: AsyncSession = Depends(get_db)):
    await _ensure_unique(db, Product, current.tenant_id, "sku", body.sku)
    item = Product(id=uuid.uuid4(), factory_id=uuid.UUID(current.tenant_id), sku=body.sku, name=body.name, revision=body.revision, defect_policy=body.defect_policy, is_active=body.is_active)
    db.add(item)
    await db.flush()
    return _as_out(item)


@router.patch("/products/{product_id}/inspection-profile")
async def update_product_inspection_profile(
    product_id: uuid.UUID,
    body: ProductInspectionProfileUpdate,
    current: CurrentUser = Depends(require_role(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product or str(product.factory_id) != current.tenant_id or product.deleted_at is not None:
        raise NotFoundError("Product")

    defect_classes = list(dict.fromkeys(label.strip().lower() for label in body.defect_classes if label.strip()))
    if body.quality_decision_enabled and (
        body.inspection_mode == "data_collection" or not defect_classes
    ):
        from app.core.exceptions import ValidationError
        raise ValidationError(
            "Quality decision requires a non-data-collection inspection mode and at least one defect class"
        )

    policy = dict(product.defect_policy or {})
    policy.update(
        {
            "industry_domain": body.industry_domain,
            "operation_stage": body.operation_stage.strip(),
            "inspection_mode": body.inspection_mode,
            "capture_mode": body.capture_mode,
            "capture_strategy": body.capture_strategy,
            "native_camera_required": body.native_camera_required,
            "alignment_overlay_required": body.alignment_overlay_required,
            "defect_classes": defect_classes,
            "human_review_required": body.human_review_required,
            "quality_decision_enabled": body.quality_decision_enabled,
        }
    )
    product.defect_policy = policy
    await db.flush()
    return _as_out(product)


@router.get("/shifts")
async def list_shifts(active_only: bool = Query(False), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _list(Shift, current, db, active_only)


@router.post("/shifts", status_code=201)
async def create_shift(body: ShiftCreate, current: CurrentUser = Depends(require_role(*ADMIN_ROLES)), db: AsyncSession = Depends(get_db)):
    await _ensure_unique(db, Shift, current.tenant_id, "name", body.name)
    item = Shift(id=uuid.uuid4(), factory_id=uuid.UUID(current.tenant_id), name=body.name, starts_at=body.starts_at, ends_at=body.ends_at, is_active=body.is_active)
    db.add(item)
    await db.flush()
    return _as_out(item)
