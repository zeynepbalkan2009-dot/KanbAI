"""
Inference task pipeline:

1. Celery task receives inspection_id
2. Fetches InspectionResult from DB (status=pending)
3. Runs inference (mock or YOLO)
4. Persists result
5. Publishes WebSocket event via Redis PubSub
6. Updates inspection status

The WebSocket event is published to Redis — the API pod's listener
picks it up and forwards to all connected tenant clients.
"""

import asyncio
import json
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from celery import Task
from celery.utils.log import get_task_logger
from sqlalchemy import update

from app.workers.celery_app import celery_app
from app.core.config import get_settings

logger = get_task_logger(__name__)
settings = get_settings()


def _get_sync_db_session():
    """Sync DB session for Celery (not async context)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    # Convert asyncpg URL to psycopg2 for sync Celery tasks
    sync_url = settings.database_url.replace("+asyncpg", "+psycopg2").replace("postgresql+psycopg2", "postgresql")
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


def _publish_redis_event(tenant_id: str, event: dict) -> None:
    """Sync Redis publish for Celery context."""
    import redis
    r = redis.from_url(settings.redis_url, decode_responses=True)
    channel = f"ws:tenant:{tenant_id}"
    r.publish(channel, json.dumps(event, default=str))
    r.close()


def _object_key_from_image_path(image_path: str) -> str:
    """Convert persisted MinIO-style image paths to an object key."""
    image_key = (image_path or "").strip().lstrip("/")
    bucket_prefix = f"{settings.minio_bucket_inspections}/"
    if image_key.startswith(bucket_prefix):
        image_key = image_key[len(bucket_prefix):]
    return image_key


def _prepare_inference_image_path(inspection, image_path: str) -> tuple[str, str | None]:
    """
    YOLO needs a local file path. Uploaded inspections are persisted in MinIO,
    so opt-in real inference downloads the object to a temporary worker file.
    """
    if settings.ai_inference_mode != "yolo":
        return image_path, None

    if image_path and Path(image_path).exists():
        return image_path, None

    object_key = getattr(inspection, "image_key", None) or _object_key_from_image_path(image_path)
    if not object_key:
        raise FileNotFoundError("Cannot resolve inspection image object key for YOLO inference")

    suffix = Path(object_key).suffix or ".jpg"
    temp_file = tempfile.NamedTemporaryFile(
        prefix="kanbai-inference-",
        suffix=suffix,
        delete=False,
    )
    temp_path = temp_file.name
    temp_file.close()

    try:
        from app.infrastructure.storage.minio_client import get_minio_client
        client = get_minio_client()
        client.fget_object(settings.minio_bucket_inspections, object_key, temp_path)
        logger.info(f"[inference] downloaded image object={object_key} path={temp_path}")
        return temp_path, temp_path
    except Exception:
        _cleanup_temp_file(temp_path)
        raise


def _cleanup_temp_file(path: str | None) -> None:
    if not path:
        return
    try:
        os.unlink(path)
    except FileNotFoundError:
        pass
    except Exception as exc:
        logger.warning(f"[inference] temp cleanup failed path={path} error={exc}")


def _demo_failure_result():
    from app.domains.ai.inference_service import DefectDetection, InferenceResult

    return InferenceResult(
        decision="fail",
        confidence=0.94,
        defects=[
            DefectDetection(class_name="crack", confidence=0.94, bbox=[0.58, 0.35, 0.82, 0.57]),
            DefectDetection(class_name="edge_chip", confidence=0.71, bbox=[0.23, 0.61, 0.38, 0.73]),
        ],
        latency_ms=1180,
        model_version="mock-v1.0-demo",
        raw_output={"scenario": "factory_demo_crack"},
    )


@celery_app.task(
    bind=True,
    name="app.workers.tasks.inference_tasks.run_inspection",
    max_retries=3,
    default_retry_delay=10,
    queue="inference",
)
def run_inspection(self: Task, inspection_id: str, image_path: str, tenant_id: str) -> dict:
    """
    Main inference task.
    Args:
        inspection_id: UUID of InspectionResult row
        image_path: local or MinIO path to image
        tenant_id: factory UUID (for tenant isolation + WS publish)
    """
    logger.info(f"[inference] start — inspection={inspection_id} tenant={tenant_id}")

    db = _get_sync_db_session()
    try:
        from app.infrastructure.database.models import InspectionResult
        from app.domains.ai.inference_service import create_inference_service
        inspection = db.query(InspectionResult).filter(InspectionResult.id == inspection_id).one_or_none()

        # Publish "processing" event immediately
        _publish_redis_event(tenant_id, {
            "type": "inspection.processing",
            "inspection_id": inspection_id,
            "task_id": self.request.id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Run inference (mock or real — same interface)
        serial = (getattr(inspection, "serial_number", None) or "").upper()
        lot = (getattr(inspection, "lot_number", None) or "").upper()
        if serial.startswith("KANBAI-DEMO") or "FACTORY-PILOT" in lot:
            time.sleep(1.2)
            result = _demo_failure_result()
        else:
            service = create_inference_service()
            local_image_path, cleanup_path = _prepare_inference_image_path(inspection, image_path)

            # Run async inference in sync context
            loop = asyncio.new_event_loop()
            try:
                result = loop.run_until_complete(service.analyze(local_image_path))
            finally:
                loop.close()
                _cleanup_temp_file(cleanup_path)

        # Persist result
        db.execute(
            update(InspectionResult)
            .where(InspectionResult.id == inspection_id)
            .values(
                decision=result.decision,
                confidence=result.confidence,
                defects=[d.__dict__ for d in result.defects],
                inference_latency_ms=result.latency_ms,
                inference_status="completed",
                celery_task_id=self.request.id,
            )
        )
        db.commit()

        # Publish completed event (picked up by WebSocket manager)
        event = {
            "type": "inspection.completed",
            "inspection_id": inspection_id,
            "decision": result.decision,
            "confidence": result.confidence,
            "defect_count": len(result.defects),
            "defects": [d.__dict__ for d in result.defects],
            "latency_ms": result.latency_ms,
            "model_version": result.model_version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _publish_redis_event(tenant_id, event)

        logger.info(
            f"[inference] complete — inspection={inspection_id} "
            f"decision={result.decision} confidence={result.confidence:.3f} "
            f"latency={result.latency_ms}ms"
        )
        return event

    except Exception as exc:
        logger.error(f"[inference] error — inspection={inspection_id} error={exc}")

        # Mark as error in DB
        try:
            from app.infrastructure.database.models import InspectionResult
            db.execute(
                update(InspectionResult)
                .where(InspectionResult.id == inspection_id)
                .values(decision="error", error_message=str(exc))
            )
            db.commit()
        except Exception:
            pass

        # Publish error event
        _publish_redis_event(tenant_id, {
            "type": "inspection.error",
            "inspection_id": inspection_id,
            "error": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        raise self.retry(exc=exc)

    finally:
        db.close()
