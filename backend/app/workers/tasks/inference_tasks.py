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
from datetime import datetime, timezone

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

        # Publish "processing" event immediately
        _publish_redis_event(tenant_id, {
            "type": "inspection.processing",
            "inspection_id": inspection_id,
            "task_id": self.request.id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Run inference (mock or real — same interface)
        service = create_inference_service()

        # Run async inference in sync context
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(service.analyze(image_path))
        loop.close()

        # Persist result
        db.execute(
            update(InspectionResult)
            .where(InspectionResult.id == inspection_id)
            .values(
                decision=result.decision,
                confidence=result.confidence,
                defects=[d.__dict__ for d in result.defects],
                inference_latency_ms=result.latency_ms,
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
