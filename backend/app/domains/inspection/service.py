"""Inspection domain — upload, queue, query."""
import uuid
import io
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, TenantIsolationError
from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.infrastructure.database.models import Device, InspectionResult, Product, ProductionLine, Shift, Station
from app.infrastructure.storage.minio_client import upload_image, validate_image, get_presigned_url
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


def analyze_capture_quality(image_data: bytes) -> dict:
    """Measure image usability without making any product-quality inference."""
    from PIL import Image, ImageFilter, ImageOps, ImageStat, UnidentifiedImageError

    try:
        with Image.open(io.BytesIO(image_data)) as source:
            image = ImageOps.exif_transpose(source).convert("L")
            width, height = image.size
            stats = ImageStat.Stat(image)
            brightness = float(stats.mean[0])
            contrast = float(stats.stddev[0])
            edge_source = image.crop((4, 4, width - 4, height - 4)) if width > 16 and height > 16 else image
            edge_stats = ImageStat.Stat(edge_source.filter(ImageFilter.FIND_EDGES))
            sharpness = float(edge_stats.var[0])
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError("Image could not be decoded for capture-quality analysis") from exc

    reasons = []
    if width < settings.capture_min_width or height < settings.capture_min_height:
        reasons.append("resolution_too_low")
    if brightness < settings.capture_brightness_min:
        reasons.append("underexposed")
    if brightness > settings.capture_brightness_max:
        reasons.append("overexposed")
    if contrast < settings.capture_contrast_min:
        reasons.append("contrast_too_low")
    if sharpness < settings.capture_sharpness_min:
        reasons.append("likely_blurred")

    return {
        "schema_version": "kanbai_capture_quality_v1",
        "usable": not reasons,
        "width": width,
        "height": height,
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "sharpness": round(sharpness, 2),
        "reasons": reasons,
        "product_quality_decision": False,
    }


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
    capture_quality: Optional[dict] = None
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
        if settings.pilot_mode:
            missing = [
                name for name, value in (
                    ("station_id", station_id),
                    ("product_id", product_id),
                    ("serial_number", serial_number),
                ) if not value
            ]
            if missing:
                raise ValidationError("Pilot captures require: " + ", ".join(missing))

        station = await self._get_station(station_id or (str(device.station_id) if device.station_id else None))
        product = await self._get_product(product_id)
        line = await self._get_line(production_line_id)
        shift = await self._get_shift(shift_id)
        if station and line and station.production_line_id and station.production_line_id != line.id:
            raise ValidationError("Station does not belong to the selected production line")
        if station and station.production_line_id and not line:
            line = await self._get_line(str(station.production_line_id))

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
        capture_quality = analyze_capture_quality(image_data)
        if settings.capture_quality_gate_enabled and not capture_quality["usable"]:
            raise ValidationError(
                "Capture quality gate rejected the image: " + ", ".join(capture_quality["reasons"])
            )

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
            production_line_id=line.id if line else None,
            station_id=station.id if station else None,
            product_id=product.id if product else None,
            shift_id=shift.id if shift else None,
            serial_number=serial_number,
            lot_number=lot_number,
            captured_at=captured_at,
            capture_quality=capture_quality,
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
        if not device.is_active or device.status != "active" or device.revoked_at is not None:
            raise ValidationError("Device is not active for capture")
        return device

    @staticmethod
    def _parse_uuid(value: str, resource: str) -> uuid.UUID:
        try:
            return uuid.UUID(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"Invalid {resource} id") from exc

    async def _get_station(self, station_id: Optional[str]) -> Optional[Station]:
        if not station_id:
            return None
        station = await self.db.get(Station, self._parse_uuid(station_id, "station"))
        if not station or station.factory_id != self.tenant_uuid or station.deleted_at is not None:
            raise NotFoundError("Station")
        if station.status != "active":
            raise ValidationError("Station is not active")
        return station

    async def _get_product(self, product_id: Optional[str]) -> Optional[Product]:
        if not product_id:
            return None
        product = await self.db.get(Product, self._parse_uuid(product_id, "product"))
        if not product or product.factory_id != self.tenant_uuid or product.deleted_at is not None:
            raise NotFoundError("Product")
        if not product.is_active:
            raise ValidationError("Product is not active")
        return product

    async def _get_line(self, line_id: Optional[str]) -> Optional[ProductionLine]:
        if not line_id:
            return None
        line = await self.db.get(ProductionLine, self._parse_uuid(line_id, "production line"))
        if not line or line.factory_id != self.tenant_uuid or line.deleted_at is not None:
            raise NotFoundError("Production line")
        if line.status != "active":
            raise ValidationError("Production line is not active")
        return line

    async def _get_shift(self, shift_id: Optional[str]) -> Optional[Shift]:
        if not shift_id:
            return None
        shift = await self.db.get(Shift, self._parse_uuid(shift_id, "shift"))
        if not shift or shift.factory_id != self.tenant_uuid or shift.deleted_at is not None:
            raise NotFoundError("Shift")
        if not shift.is_active:
            raise ValidationError("Shift is not active")
        return shift

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
