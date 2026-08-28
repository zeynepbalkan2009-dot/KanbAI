import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.domains.auth.service import CurrentUser, get_current_user, require_role
from app.infrastructure.database.models import (
    BatteryStepEvidence,
    BatteryCellComponent,
    BatteryUnit,
    InspectionResult,
    Product,
    ProductionLine,
    Station,
)
from app.infrastructure.database.session import get_db


router = APIRouter(prefix="/battery", tags=["battery-traceability"])
REVIEW_ROLES = ("admin", "manager", "quality_manager")

BATTERY_STEPS = (
    {"step_id": 1, "code": "cell_preparation", "name": "Cell Preparation & Incoming QC", "expected_label": "cell_block_valid", "evidence_type": "visual_and_identity"},
    {"step_id": 2, "code": "module_assembly", "name": "Module Assembly", "expected_label": "isolation_plate_ok", "evidence_type": "visual"},
    {"step_id": 3, "code": "welding_busbar", "name": "Welding & Busbar Integration", "expected_label": "busbar_secure", "evidence_type": "visual"},
    {"step_id": 4, "code": "bms_integration", "name": "BMS & Harness Connection", "expected_label": "harness_connected", "evidence_type": "visual_and_configuration"},
    {"step_id": 5, "code": "packaging_sealing", "name": "Packaging & Sealing", "expected_label": "gasket_sealed", "evidence_type": "visual_and_test"},
    {"step_id": 6, "code": "eol_test", "name": "EOL & Final QC", "expected_label": "eol_passed", "evidence_type": "test_results"},
)
STEP_BY_ID = {step["step_id"]: step for step in BATTERY_STEPS}


class BatteryUnitCreate(BaseModel):
    product_id: uuid.UUID
    production_line_id: Optional[uuid.UUID] = None
    serial_number: str = Field(min_length=2, max_length=120)
    barcode: Optional[str] = Field(default=None, max_length=255)
    cell_type: Literal["prismatic", "cylindrical", "pouch"]
    expected_cell_count: int = Field(ge=1, le=10000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StepEvidenceCreate(BaseModel):
    station_id: Optional[uuid.UUID] = None
    inspection_id: Optional[uuid.UUID] = None
    observed_label: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None
    test_results: dict[str, Any] = Field(default_factory=dict)


class StepReviewIn(BaseModel):
    decision: Literal["pass", "fail"]
    observed_label: str = Field(min_length=2, max_length=100)
    notes: Optional[str] = None


class BatteryCellCreate(BaseModel):
    cell_identifier: str = Field(min_length=2, max_length=255)
    position_code: str = Field(min_length=1, max_length=80)
    declared_cell_type: Literal["prismatic", "cylindrical", "pouch"]
    inspection_id: Optional[uuid.UUID] = None
    detected_cell_type: Optional[Literal["prismatic", "cylindrical", "pouch"]] = None
    model_confidence: Optional[float] = Field(default=None, ge=0, le=1)


class BatteryCellVerifyIn(BaseModel):
    decision: Literal["match", "mismatch"]
    mismatch_reason: Optional[str] = None


def unit_out(unit: BatteryUnit) -> dict:
    return {
        "id": str(unit.id),
        "factory_id": str(unit.factory_id),
        "product_id": str(unit.product_id),
        "production_line_id": str(unit.production_line_id) if unit.production_line_id else None,
        "serial_number": unit.serial_number,
        "barcode": unit.barcode,
        "cell_type": unit.cell_type,
        "expected_cell_count": unit.expected_cell_count,
        "status": unit.status,
        "current_step": unit.current_step,
        "metadata": unit.metadata_json or {},
        "completed_at": unit.completed_at,
        "created_at": unit.created_at,
    }


def cell_out(item: BatteryCellComponent) -> dict:
    return {
        "id": str(item.id),
        "battery_unit_id": str(item.battery_unit_id),
        "inspection_id": str(item.inspection_id) if item.inspection_id else None,
        "cell_identifier": item.cell_identifier,
        "position_code": item.position_code,
        "declared_cell_type": item.declared_cell_type,
        "detected_cell_type": item.detected_cell_type,
        "model_confidence": item.model_confidence,
        "verification_status": item.verification_status,
        "human_verified": item.human_verified,
        "mismatch_reason": item.mismatch_reason,
        "verified_at": item.verified_at,
        "created_at": item.created_at,
    }


def evidence_out(item: BatteryStepEvidence) -> dict:
    return {
        "id": str(item.id),
        "battery_unit_id": str(item.battery_unit_id),
        "station_id": str(item.station_id) if item.station_id else None,
        "inspection_id": str(item.inspection_id) if item.inspection_id else None,
        "step_id": item.step_id,
        "step_name": item.step_name,
        "expected_label": item.expected_label,
        "attempt_no": item.attempt_no,
        "status": item.status,
        "human_decision": item.human_decision,
        "observed_label": item.observed_label,
        "notes": item.notes,
        "test_results": item.test_results or {},
        "reviewed_at": item.reviewed_at,
        "created_at": item.created_at,
    }


async def get_unit(db: AsyncSession, unit_id: uuid.UUID, tenant_id: str) -> BatteryUnit:
    unit = await db.get(BatteryUnit, unit_id)
    if not unit or str(unit.factory_id) != tenant_id:
        raise NotFoundError("Battery unit")
    return unit


@router.get("/workflow")
async def get_battery_workflow(current: CurrentUser = Depends(get_current_user)):
    return {"workflow": "battery_assembly_v1", "automatic_quality_decision": False, "steps": BATTERY_STEPS}


@router.post("/units", status_code=201)
async def create_battery_unit(body: BatteryUnitCreate, current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager", "operator")), db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, body.product_id)
    if not product or str(product.factory_id) != current.tenant_id or product.deleted_at is not None:
        raise NotFoundError("Product")
    if (product.defect_policy or {}).get("industry_domain") != "battery_assembly":
        raise ValidationError("Battery workflow requires a product with industry_domain=battery_assembly")
    if body.production_line_id:
        line = await db.get(ProductionLine, body.production_line_id)
        if not line or str(line.factory_id) != current.tenant_id:
            raise NotFoundError("Production line")
    duplicate = await db.execute(select(BatteryUnit.id).where(BatteryUnit.factory_id == uuid.UUID(current.tenant_id), BatteryUnit.serial_number == body.serial_number.strip()))
    if duplicate.scalar_one_or_none():
        raise ConflictError("Battery serial number already exists")
    if body.barcode:
        duplicate_barcode = await db.execute(select(BatteryUnit.id).where(BatteryUnit.factory_id == uuid.UUID(current.tenant_id), BatteryUnit.barcode == body.barcode.strip()))
        if duplicate_barcode.scalar_one_or_none():
            raise ConflictError("Battery barcode already exists")
    unit = BatteryUnit(
        id=uuid.uuid4(), factory_id=uuid.UUID(current.tenant_id), product_id=body.product_id,
        production_line_id=body.production_line_id, serial_number=body.serial_number.strip(),
        barcode=body.barcode.strip() if body.barcode else None, cell_type=body.cell_type,
        expected_cell_count=body.expected_cell_count,
        status="in_progress", current_step=1, metadata_json=body.metadata,
    )
    db.add(unit)
    await db.flush()
    return unit_out(unit)


@router.get("/units")
async def list_battery_units(status: Optional[str] = Query(None), limit: int = Query(50, le=200), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(BatteryUnit).where(BatteryUnit.factory_id == uuid.UUID(current.tenant_id)).order_by(BatteryUnit.created_at.desc()).limit(limit)
    if status:
        query = query.where(BatteryUnit.status == status)
    result = await db.execute(query)
    return [unit_out(item) for item in result.scalars().all()]


@router.get("/units/{unit_id}")
async def get_battery_unit(unit_id: uuid.UUID, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    unit = await get_unit(db, unit_id, current.tenant_id)
    evidence = await db.execute(select(BatteryStepEvidence).where(BatteryStepEvidence.battery_unit_id == unit.id).order_by(BatteryStepEvidence.step_id, BatteryStepEvidence.attempt_no))
    cells = await db.execute(select(BatteryCellComponent).where(BatteryCellComponent.battery_unit_id == unit.id).order_by(BatteryCellComponent.position_code))
    return {**unit_out(unit), "steps": [evidence_out(item) for item in evidence.scalars().all()], "cells": [cell_out(item) for item in cells.scalars().all()]}


@router.post("/units/{unit_id}/cells", status_code=201)
async def register_battery_cell(unit_id: uuid.UUID, body: BatteryCellCreate, current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager", "operator")), db: AsyncSession = Depends(get_db)):
    unit = await get_unit(db, unit_id, current.tenant_id)
    if unit.current_step != 1:
        raise ConflictError("Incoming cells can only be registered during workflow step 1")
    count = await db.scalar(select(func.count()).select_from(BatteryCellComponent).where(BatteryCellComponent.battery_unit_id == unit.id))
    if (count or 0) >= unit.expected_cell_count:
        raise ConflictError("Expected cell count has already been reached")
    duplicate = await db.scalar(select(BatteryCellComponent.id).where(
        BatteryCellComponent.factory_id == unit.factory_id,
        BatteryCellComponent.cell_identifier == body.cell_identifier.strip(),
    ))
    if duplicate:
        raise ConflictError("Cell identifier is already assigned in this factory")
    occupied = await db.scalar(select(BatteryCellComponent.id).where(
        BatteryCellComponent.battery_unit_id == unit.id,
        BatteryCellComponent.position_code == body.position_code.strip(),
    ))
    if occupied:
        raise ConflictError("Cell position is already occupied in this battery unit")
    if body.inspection_id:
        inspection = await db.get(InspectionResult, body.inspection_id)
        if not inspection or str(inspection.factory_id) != current.tenant_id:
            raise NotFoundError("Inspection")
    item = BatteryCellComponent(
        id=uuid.uuid4(), factory_id=unit.factory_id, battery_unit_id=unit.id,
        inspection_id=body.inspection_id, cell_identifier=body.cell_identifier.strip(),
        position_code=body.position_code.strip(), declared_cell_type=body.declared_cell_type,
        detected_cell_type=body.detected_cell_type, model_confidence=body.model_confidence,
        verification_status="awaiting_human", human_verified=False,
        registered_by=uuid.UUID(current.user_id),
    )
    db.add(item)
    await db.flush()
    return cell_out(item)


@router.post("/cells/{cell_id}/verify")
async def verify_battery_cell(cell_id: uuid.UUID, body: BatteryCellVerifyIn, current: CurrentUser = Depends(require_role(*REVIEW_ROLES)), db: AsyncSession = Depends(get_db)):
    item = await db.get(BatteryCellComponent, cell_id)
    if not item or str(item.factory_id) != current.tenant_id:
        raise NotFoundError("Battery cell")
    if body.decision == "mismatch" and not (body.mismatch_reason or "").strip():
        raise ValidationError("Mismatch verification requires mismatch_reason")
    item.human_verified = True
    item.verification_status = "verified_match" if body.decision == "match" else "verified_mismatch"
    item.mismatch_reason = body.mismatch_reason.strip() if body.mismatch_reason else None
    item.verified_by = uuid.UUID(current.user_id)
    item.verified_at = datetime.now(timezone.utc)
    await db.flush()
    return cell_out(item)


@router.post("/units/{unit_id}/steps/{step_id}/evidence", status_code=201)
async def create_step_evidence(unit_id: uuid.UUID, step_id: int, body: StepEvidenceCreate, current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager", "operator")), db: AsyncSession = Depends(get_db)):
    unit = await get_unit(db, unit_id, current.tenant_id)
    step = STEP_BY_ID.get(step_id)
    if not step:
        raise ValidationError("step_id must be between 1 and 6")
    if unit.status == "completed":
        raise ConflictError("Battery workflow is already completed")
    if step_id != unit.current_step:
        raise ConflictError(f"Evidence must be recorded for current_step={unit.current_step}")
    if body.station_id:
        station = await db.get(Station, body.station_id)
        if not station or str(station.factory_id) != current.tenant_id:
            raise NotFoundError("Station")
    if body.inspection_id:
        inspection = await db.get(InspectionResult, body.inspection_id)
        if not inspection or str(inspection.factory_id) != current.tenant_id:
            raise NotFoundError("Inspection")
        if inspection.product_id and inspection.product_id != unit.product_id:
            raise ValidationError("Inspection product does not match the battery unit product")
    if step_id == 6 and not body.test_results:
        raise ValidationError("EOL evidence requires test_results; RGB imagery alone is not an EOL test")
    pending = await db.execute(select(BatteryStepEvidence.id).where(BatteryStepEvidence.battery_unit_id == unit.id, BatteryStepEvidence.step_id == step_id, BatteryStepEvidence.status == "awaiting_review"))
    if pending.scalar_one_or_none():
        raise ConflictError("This step already has evidence awaiting human review")
    attempts = await db.execute(select(func.count()).select_from(BatteryStepEvidence).where(BatteryStepEvidence.battery_unit_id == unit.id, BatteryStepEvidence.step_id == step_id))
    item = BatteryStepEvidence(
        id=uuid.uuid4(), factory_id=unit.factory_id, battery_unit_id=unit.id,
        station_id=body.station_id, inspection_id=body.inspection_id, step_id=step_id,
        step_name=step["name"], expected_label=step["expected_label"],
        attempt_no=(attempts.scalar() or 0) + 1, status="awaiting_review",
        observed_label=body.observed_label, notes=body.notes, test_results=body.test_results,
        captured_by=uuid.UUID(current.user_id),
    )
    db.add(item)
    await db.flush()
    return evidence_out(item)


@router.post("/evidence/{evidence_id}/review")
async def review_step_evidence(evidence_id: uuid.UUID, body: StepReviewIn, current: CurrentUser = Depends(require_role(*REVIEW_ROLES)), db: AsyncSession = Depends(get_db)):
    item = await db.get(BatteryStepEvidence, evidence_id)
    if not item or str(item.factory_id) != current.tenant_id:
        raise NotFoundError("Battery step evidence")
    if item.status != "awaiting_review":
        raise ConflictError("Evidence has already been reviewed")
    unit = await get_unit(db, item.battery_unit_id, current.tenant_id)
    if item.step_id == 1 and body.decision == "pass":
        cells = await db.execute(select(BatteryCellComponent).where(BatteryCellComponent.battery_unit_id == unit.id))
        registered_cells = list(cells.scalars().all())
        if len(registered_cells) != unit.expected_cell_count:
            raise ValidationError(f"Step 1 requires exactly {unit.expected_cell_count} registered cells")
        if any(cell.verification_status != "verified_match" for cell in registered_cells):
            raise ValidationError("Step 1 cannot pass until every cell identity, position, and type is human-verified as a match")
    now = datetime.now(timezone.utc)
    item.human_decision = body.decision
    item.observed_label = body.observed_label.strip()
    item.notes = body.notes
    item.reviewed_by = uuid.UUID(current.user_id)
    item.reviewed_at = now
    item.status = "accepted" if body.decision == "pass" else "rejected"
    if body.decision == "pass":
        if item.step_id == 6:
            unit.current_step = 6
            unit.status = "completed"
            unit.completed_at = now
        else:
            unit.current_step = item.step_id + 1
            unit.status = "in_progress"
    else:
        unit.current_step = item.step_id
        unit.status = "blocked_by_quality"
    await db.flush()
    return {"evidence": evidence_out(item), "battery_unit": unit_out(unit), "automatic_quality_decision": False}
