import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
import csv
import io
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.domains.auth.service import get_current_user, CurrentUser
from app.domains.inspection.service import (
    InspectionService, InspectionOut, InspectionStats, ReviewRequest,
)
from app.infrastructure.database.session import get_db
from app.infrastructure.storage.minio_client import get_minio_client

router = APIRouter(prefix="/inspections", tags=["inspections"])
settings = get_settings()


def _svc(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InspectionService:
    return InspectionService(db, current.tenant_id, current.user_id)


@router.post("", status_code=202)
async def create_inspection(
    device_id: str = Form(...),
    file: UploadFile = File(...),
    production_line_id: Optional[str] = Form(None),
    station_id: Optional[str] = Form(None),
    product_id: Optional[str] = Form(None),
    shift_id: Optional[str] = Form(None),
    serial_number: Optional[str] = Form(None),
    lot_number: Optional[str] = Form(None),
    captured_at: Optional[datetime] = Form(None),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    svc: InspectionService = Depends(_svc),
):
    """Upload image and queue AI inspection."""
    data = await file.read()
    inspection, task_id = await svc.create_inspection(
        device_id=device_id,
        image_data=data,
        content_type=file.content_type or "image/jpeg",
        filename=file.filename or "upload.jpg",
        production_line_id=production_line_id,
        station_id=station_id,
        product_id=product_id,
        shift_id=shift_id,
        serial_number=serial_number,
        lot_number=lot_number,
        captured_at=captured_at,
        idempotency_key=idempotency_key,
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


@router.get("/export.csv")
async def export_inspections_csv(
    decision: Optional[str] = Query(None),
    limit: int = Query(1000, le=5000),
    svc: InspectionService = Depends(_svc),
):
    inspections = await svc.list_inspections(decision=decision, limit=limit, offset=0)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["inspection_id", "device_id", "decision", "confidence", "operator_decision", "serial_number", "lot_number", "created_at"])
    for item in inspections:
        writer.writerow([item.id, item.device_id, item.decision, item.confidence, item.operator_decision, item.serial_number, item.lot_number, item.created_at])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=kanbai-inspections.csv"})


@router.get("/{inspection_id}", response_model=InspectionOut)
async def get_inspection(
    inspection_id: str,
    svc: InspectionService = Depends(_svc),
):
    inspection = await svc.get_inspection(inspection_id)
    return svc.add_presigned_url(inspection)


@router.get("/{inspection_id}/image")
async def get_inspection_image(
    inspection_id: str,
    svc: InspectionService = Depends(_svc),
):
    """Stream an authenticated inspection image through the API gateway."""
    inspection = await svc.get_inspection(inspection_id)
    client = get_minio_client()
    response = client.get_object(settings.minio_bucket_inspections, inspection.image_key)
    try:
        data = response.read()
    finally:
        response.close()
        response.release_conn()

    ext = inspection.image_key.rsplit(".", 1)[-1].lower()
    media_type = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
    }.get(ext, "application/octet-stream")
    return Response(content=data, media_type=media_type)


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
