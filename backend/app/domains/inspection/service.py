"""Inspection domain — upload, queue, query."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, TenantIsolationError
from app.core.logging import get_logger
from app.infrastructure.database.models import InspectionResult, Device
from app.infrastructure.storage.minio_client import upload_image, validate_image, get_presigned_url
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


# ── Schemas ───────────────────────────────────────────────────────────────────

class InspectionOut(BaseModel):
    id: uuid.UUID
    factory_id: uuid.UUID
    device_id: uuid.UUID
    image_key: str
    image_url: Optional[str] = None
    decision: str
    confidence: Optional[float]
    defects: Optional[list]
    operator_decision: Optional[str]
    inference_latency_ms: Optional[int]
    celery_task_id: Optional[str]
    production_line_id: Optional[uuid.UUID] = None
    station_id: Optional[uuid.UUID] = None
    product_id: Optional[uuid.UUID] = None
    shift_id: Optional[uuid.UUID] = None
    serial_number: Optional[str] = None
    lot_number: Optional[str] = None
    captured_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InspectionStats(BaseModel):
    total: int
    pass_count: int
    fail_count: int
    review_count: int
    pending_count: int
    pass_rate: float
    avg_confidence: Optional[float]


class ReviewRequest(BaseModel):
    operator_decision: str  # "pass" | "fail"
    notes: Optional[str] = None


# ── Service ───────────────────────────────────────────────────────────────────

class InspectionService:
    def __init__(self, db: AsyncSession, tenant_id: str, user_id: str):
        self.db = db
        self.tenant_id = tenant_id
        self.tenant_uuid = uuid.UUID(tenant_id)
        self.user_id = user_id

    async def create_inspection(
        self,
        device_id: str,
        image_data: bytes,
        content_type: str,
        filename: str,
        production_line_id: Optional[str] = None,
        station_id: Optional[str] = None,
        product_id: Optional[str] = None,
        shift_id: Optional[str] = None,
        serial_number: Optional[str] = None,
        lot_number: Optional[str] = None,
        captured_at: Optional[datetime] = None,
        idempotency_key: Optional[str] = None,
    ) -> tuple[InspectionResult, str]:
        """
        Upload image → create pending inspection → queue Celery task.
        Returns (inspection, task_id).
        """
        # Validate device belongs to this tenant
        device = await self._get_device(device_id)

        if idempotency_key:
            existing = await self.db.execute(
                select(InspectionResult).where(
                    InspectionResult.factory_id == self.tenant_uuid,
                    InspectionResult.idempotency_key == idempotency_key,
                    InspectionResult.deleted_at.is_(None),
                )
            )
            existing_inspection = existing.scalar_one_or_none()
            if existing_inspection:
                return existing_inspection, existing_inspection.celery_task_id or "already-queued"

        # Validate image
        validate_image(image_data, content_type)

        # Upload to MinIO
        image_key, image_path = await upload_image(
            data=image_data,
            content_type=content_type,
            factory_id=self.tenant_id,
            device_id=device_id,
            original_filename=filename,
        )

        # Create DB record (pending)
        inspection = InspectionResult(
            id=uuid.uuid4(),
            factory_id=uuid.UUID(self.tenant_id),
            device_id=uuid.UUID(device_id),
            image_key=image_key,
            image_path=image_path,
            decision="pending",
            inference_status="queued",
            production_line_id=uuid.UUID(production_line_id) if production_line_id else None,
            station_id=uuid.UUID(station_id) if station_id else getattr(device, "station_id", None),
            product_id=uuid.UUID(product_id) if product_id else None,
            shift_id=uuid.UUID(shift_id) if shift_id else None,
            serial_number=serial_number,
            lot_number=lot_number,
            captured_at=captured_at,
            idempotency_key=idempotency_key,
            thumbnail_key=image_key,
        )
        self.db.add(inspection)
        await self.db.flush()

        # Queue Celery task
        from app.workers.tasks.inference_tasks import run_inspection
        task = run_inspection.delay(
            inspection_id=str(inspection.id),
            image_path=image_path,
            tenant_id=self.tenant_id,
        )

        # Save task ID
        inspection.celery_task_id = task.id
        await self.db.flush()

        logger.info(
            "inspection_queued",
            inspection_id=str(inspection.id),
            task_id=task.id,
            device_id=device_id,
        )
        return inspection, task.id

    async def list_inspections(
        self,
        device_id: Optional[str] = None,
        decision: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InspectionResult]:
        q = (
            select(InspectionResult)
            .where(
                InspectionResult.factory_id == self.tenant_uuid,
                InspectionResult.deleted_at.is_(None),
            )
            .order_by(InspectionResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if device_id:
            q = q.where(InspectionResult.device_id == uuid.UUID(device_id))
        if decision:
            q = q.where(InspectionResult.decision == decision)

        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_inspection(self, inspection_id: str) -> InspectionResult:
        result = await self.db.execute(
            select(InspectionResult).where(
                InspectionResult.id == inspection_id,
                InspectionResult.deleted_at.is_(None),
            )
        )
        inspection = result.scalar_one_or_none()
        if not inspection:
            raise NotFoundError("Inspection")
        if str(inspection.factory_id) != self.tenant_id:
            raise TenantIsolationError()
        return inspection

    async def review_inspection(
        self, inspection_id: str, decision: str, notes: Optional[str]
    ) -> InspectionResult:
        from datetime import timezone
        from sqlalchemy import update as sa_update
        inspection = await self.get_inspection(inspection_id)
        await self.db.execute(
            sa_update(InspectionResult)
            .where(InspectionResult.id == inspection_id)
            .values(
                operator_decision=decision,
                operator_id=uuid.UUID(self.user_id),
                operator_notes=notes,
                reviewed_at=datetime.now(timezone.utc),
            )
        )
        await self.db.flush()
        await self.db.refresh(inspection)
        return inspection

    async def get_stats(self) -> InspectionStats:
        result = await self.db.execute(
            select(
                func.count().label("total"),
                func.sum(case((InspectionResult.decision == "pass", 1), else_=0)).label("pass_count"),
                func.sum(case((InspectionResult.decision == "fail", 1), else_=0)).label("fail_count"),
                func.sum(case((InspectionResult.decision == "review", 1), else_=0)).label("review_count"),
                func.sum(case((InspectionResult.decision == "pending", 1), else_=0)).label("pending_count"),
                func.avg(InspectionResult.confidence).label("avg_confidence"),
            ).where(
                InspectionResult.factory_id == self.tenant_uuid,
                InspectionResult.deleted_at.is_(None),
            )
        )
        row = result.one()
        total = row.total or 0
        pass_count = row.pass_count or 0
        return InspectionStats(
            total=total,
            pass_count=pass_count,
            fail_count=row.fail_count or 0,
            review_count=row.review_count or 0,
            pending_count=row.pending_count or 0,
            pass_rate=round(pass_count / total, 4) if total > 0 else 0.0,
            avg_confidence=round(float(row.avg_confidence), 4) if row.avg_confidence else None,
        )

    async def _get_device(self, device_id: str) -> Device:
        device_uuid = uuid.UUID(device_id)
        result = await self.db.execute(
            select(Device).where(
                Device.id == device_uuid,
                Device.factory_id == self.tenant_uuid,
                Device.deleted_at.is_(None),
            )
        )
        device = result.scalar_one_or_none()
        if not device:
            raise NotFoundError("Device")
        return device

    @staticmethod
    def add_presigned_url(inspection: InspectionResult) -> InspectionOut:
        out = InspectionOut.model_validate(inspection)
        try:
            out.image_url = get_presigned_url(
                settings.minio_bucket_inspections,
                inspection.image_key,
            )
        except Exception:
            pass
        return out
