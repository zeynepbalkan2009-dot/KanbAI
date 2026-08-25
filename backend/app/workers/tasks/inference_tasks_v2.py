"""
Production Inference Task — Full Event Flow
============================================

Mobile → Upload → MinIO → Celery → AI Inference → PostgreSQL → Redis PubSub → WebSocket → Dashboard

Event types emitted:
  inspection.queued      → immediately on upload
  inspection.processing  → when worker picks up task
  inspection.completed   → inference done (pass/fail/review)
  inspection.error       → unrecoverable error
  inspection.review_ready → review state, HITL triggered

Reliability:
  - Idempotent: task_id stored in DB, duplicate tasks silently skip
  - Retry: up to 3 retries with exponential backoff (10s, 20s, 40s)
  - At-least-once delivery (acks_late=True, reject_on_worker_lost=True)
  - Dead letter queue after max retries
"""

import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Optional
import logging

from celery import Task
from celery.utils.log import get_task_logger

# Lazy imports to avoid circular dependencies
logger = get_task_logger(__name__)


def _get_db_session():
    """Sync SQLAlchemy session for Celery context."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import os
    url = os.environ["DATABASE_URL"].replace("+asyncpg", "").replace(
        "postgresql://", "postgresql+psycopg2://"
    )
    engine = create_engine(url, pool_pre_ping=True, pool_size=3, max_overflow=5)
    return sessionmaker(bind=engine)()


def _publish(redis_url: str, tenant_id: str, event: dict) -> None:
    """Sync Redis publish."""
    import redis as redis_lib
    r = redis_lib.from_url(redis_url, decode_responses=True)
    channel = f"ws:tenant:{tenant_id}"
    r.publish(channel, json.dumps(event, default=str))
    r.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Main inference task ───────────────────────────────────────────────────────

def make_inference_task(celery_app):
    """Factory — returns configured Celery task."""

    @celery_app.task(
        bind=True,
        name="app.workers.tasks.inference_tasks.run_inspection_v2",
        max_retries=3,
        default_retry_delay=10,
        queue="inference",
        acks_late=True,
        reject_on_worker_lost=True,
        task_soft_time_limit=120,
        task_time_limit=180,
    )
    def run_inspection(
        self: Task,
        inspection_id: str,
        image_path: str,
        tenant_id: str,
        factory_thresholds: Optional[dict] = None,
    ) -> dict:
        """
        Args:
            inspection_id:      UUID of InspectionResult row (idempotency key)
            image_path:         MinIO object path
            tenant_id:          Factory UUID (tenant isolation + WS channel)
            factory_thresholds: Optional per-factory threshold override
        """
        import os
        redis_url = os.environ["REDIS_URL"]

        # ── Idempotency check ──────────────────────────────────────────────
        db = _get_db_session()
        try:
            from app.infrastructure.database.models import InspectionResult
            from sqlalchemy import select
            row = db.execute(
                select(InspectionResult).where(
                    InspectionResult.id == inspection_id
                )
            ).scalar_one_or_none()

            if row is None:
                logger.error(f"inspection_not_found id={inspection_id}")
                return {"error": "not_found"}

            # Already processed — skip (idempotent)
            if row.decision not in ("pending", "error"):
                logger.info(f"inspection_already_processed id={inspection_id} decision={row.decision}")
                return {"skipped": True, "decision": row.decision}

            # ── Emit: processing ─────────────────────────────────────────
            _publish(redis_url, tenant_id, {
                "type":          "inspection.processing",
                "inspection_id": inspection_id,
                "task_id":       self.request.id,
                "worker":        self.request.hostname,
                "timestamp":     _now(),
            })

            # ── Run inference ─────────────────────────────────────────────
            t0 = time.monotonic()
            result = _run_inference_sync(image_path, factory_thresholds)
            elapsed = int((time.monotonic() - t0) * 1000)

            # ── Persist result ────────────────────────────────────────────
            from sqlalchemy import update
            db.execute(
                update(InspectionResult)
                .where(InspectionResult.id == inspection_id)
                .values(
                    decision=result["decision"],
                    confidence=result["confidence"],
                    defects=result["defects"],
                    inference_latency_ms=result["latency_ms"],
                    celery_task_id=self.request.id,
                    error_message=None,
                )
            )
            db.commit()

            # ── Determine event type ──────────────────────────────────────
            decision = result["decision"]
            if decision == "review":
                event_type = "inspection.review_ready"
                # Trigger HITL queue
                _enqueue_review(celery_app, inspection_id, tenant_id, result)
            else:
                event_type = "inspection.completed"

            # ── Emit: completed ───────────────────────────────────────────
            ws_event = {
                "type":          event_type,
                "inspection_id": inspection_id,
                "tenant_id":     tenant_id,
                "decision":      decision,
                "confidence":    result["confidence"],
                "defect_count":  len(result["defects"]),
                "defects":       result["defects"],
                "latency_ms":    result["latency_ms"],
                "model_version": result["model_version"],
                "backend":       result["backend"],
                "timestamp":     _now(),
            }
            _publish(redis_url, tenant_id, ws_event)

            result_confidence = result["confidence"]
            confidence_text = (
                f"{result_confidence:.3f}"
                if isinstance(result_confidence, (int, float))
                else "n/a"
            )
            logger.info(
                f"inference_complete "
                f"id={inspection_id} "
                f"decision={decision} "
                f"confidence={confidence_text} "
                f"latency={elapsed}ms"
            )
            return ws_event

        except Exception as exc:
            logger.error(f"inference_error id={inspection_id} err={exc}")

            # Persist error state
            try:
                from app.infrastructure.database.models import InspectionResult
                from sqlalchemy import update
                db.execute(
                    update(InspectionResult)
                    .where(InspectionResult.id == inspection_id)
                    .values(decision="error", error_message=str(exc)[:500])
                )
                db.commit()
            except Exception:
                pass

            # Publish error event
            try:
                _publish(redis_url, tenant_id, {
                    "type":          "inspection.error",
                    "inspection_id": inspection_id,
                    "error":         str(exc),
                    "retry_count":   self.request.retries,
                    "timestamp":     _now(),
                })
            except Exception:
                pass

            # Exponential backoff retry
            countdown = 10 * (2 ** self.request.retries)  # 10s, 20s, 40s
            raise self.retry(exc=exc, countdown=countdown)

        finally:
            db.close()

    return run_inspection


def _run_inference_sync(image_path: str, thresholds: Optional[dict]) -> dict:
    """
    Sync wrapper around async inference engine for Celery context.
    Creates a new event loop per call (Celery tasks run in threads).
    """
    import os
    import sys
    sys.path.insert(0, str(__file__).split("mlops")[0])

    from mlops.inference.inference_engine import run_inference, ThresholdConfig

    mode = os.environ.get("AI_INFERENCE_MODE", "mock")
    if mode == "onnx":
        model_path = os.environ.get("ONNX_MODEL_PATH", "models/best.onnx")
    else:
        model_path = os.environ.get("YOLO_MODEL_PATH", "models/best.pt")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            run_inference(image_path, mode, model_path, thresholds)
        )
        return result.to_dict()
    finally:
        loop.close()


def _enqueue_review(celery_app, inspection_id: str, tenant_id: str, result: dict):
    """Push to HITL review queue."""
    celery_app.send_task(
        "app.workers.tasks.hitl_tasks.create_review_item",
        kwargs={
            "inspection_id": inspection_id,
            "tenant_id":     tenant_id,
            "ai_result":     result,
        },
        queue="default",
    )
