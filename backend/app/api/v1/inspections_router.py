import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.service import get_current_user, CurrentUser
from app.domains.inspection.service import (
    InspectionService, InspectionOut, InspectionStats, ReviewRequest,
)
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/inspections", tags=["inspections"])


def _svc(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InspectionService:
    return InspectionService(db, current.tenant_id, current.user_id)


@router.post("", status_code=202)
async def create_inspection(
    device_id: str = Form(...),
    file: UploadFile = File(...),
    svc: InspectionService = Depends(_svc),
):
    """Upload image and queue AI inspection."""
    data = await file.read()
    inspection, task_id = await svc.create_inspection(
        device_id=device_id,
        image_data=data,
        content_type=file.content_type or "image/jpeg",
        filename=file.filename or "upload.jpg",
    )
    return {
        "inspection_id": str(inspection.id),
        "task_id": task_id,
        "status": "queued",
    }


@router.get("", response_model=list[InspectionOut])
async def list_inspections(
    device_id: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    svc: InspectionService = Depends(_svc),
):
    inspections = await svc.list_inspections(
        device_id=device_id,
        decision=decision,
        limit=limit,
        offset=offset,
    )
    return [svc.add_presigned_url(i) for i in inspections]


@router.get("/stats", response_model=InspectionStats)
async def get_stats(svc: InspectionService = Depends(_svc)):
    return await svc.get_stats()


@router.get("/{inspection_id}", response_model=InspectionOut)
async def get_inspection(
    inspection_id: str,
    svc: InspectionService = Depends(_svc),
):
    inspection = await svc.get_inspection(inspection_id)
    return svc.add_presigned_url(inspection)


@router.patch("/{inspection_id}/review", response_model=InspectionOut)
async def review_inspection(
    inspection_id: str,
    body: ReviewRequest,
    svc: InspectionService = Depends(_svc),
):
    """Operator manual override."""
    if body.operator_decision not in ("pass", "fail"):
        from app.core.exceptions import ValidationError
        raise ValidationError("operator_decision must be 'pass' or 'fail'")
    inspection = await svc.review_inspection(
        inspection_id, body.operator_decision, body.notes
    )
    return svc.add_presigned_url(inspection)
