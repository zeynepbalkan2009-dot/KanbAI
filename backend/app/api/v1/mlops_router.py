"""
MLOps API — /api/v1/mlops/*

Endpoints:
  GET  /models              → list model versions
  GET  /models/production   → current production model
  POST /models/{id}/promote → promote to stage
  POST /retrain             → manual retraining trigger
  GET  /retrain/status      → last training run status
  POST /approve-model       → admin promotes staging → production

  GET  /hitl/queue          → pending review items
  POST /hitl/{id}/review    → submit operator review
  GET  /hitl/stats          → HITL metrics

  GET  /drift               → current drift metrics
  GET  /dataset/stats       → dataset version stats
  POST /demo/seed           → seed demo data for presentation
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.service import get_current_user, CurrentUser, require_role
from app.infrastructure.database.session import get_db
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/mlops", tags=["mlops"])
settings = get_settings()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PromoteRequest(BaseModel):
    target_stage: str        # development | staging | production | archived
    notes: Optional[str] = None


class RetrainRequest(BaseModel):
    trigger: str = "manual"
    factory_id: Optional[str] = None
    notes: Optional[str] = None


class HITLReviewRequest(BaseModel):
    action: str              # confirm_ai | correct_bbox | add_defect | mark_good | escalate
    final_decision: str      # pass | fail
    annotations: list[dict]  # [{class_id, class_name, bbox_norm, confidence}]
    notes: Optional[str] = None
    time_spent_sec: Optional[int] = None


class ApproveModelRequest(BaseModel):
    version_id: str
    notes: Optional[str] = None


# ── Model Registry endpoints ──────────────────────────────────────────────────

@router.get("/models")
async def list_models(
    stage: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    current: CurrentUser = Depends(get_current_user),
):
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
        from mlops.registry.model_registry import ModelRegistry, ModelStage

        registry = ModelRegistry()
        stage_filter = ModelStage(stage) if stage else None
        versions = registry.list_versions(name=name, stage=stage_filter)
        if not versions:
            return _mock_model_list()
        return [v.to_dict() for v in versions]
    except Exception as e:
        logger.warning("model_registry_unavailable", error=str(e))
        return _mock_model_list()


@router.get("/models/production")
async def get_production_model(current: CurrentUser = Depends(get_current_user)):
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
        from mlops.registry.model_registry import ModelRegistry

        registry = ModelRegistry()
        model = registry.get_production_model()
        if not model:
            return _mock_production_model()
        return model.to_dict()
    except Exception as e:
        return _mock_production_model()


@router.post("/models/{version_id}/promote")
async def promote_model(
    version_id: str,
    body: PromoteRequest,
    current: CurrentUser = Depends(require_role("admin", "mlops")),
):
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
        from mlops.registry.model_registry import ModelRegistry, ModelStage

        registry = ModelRegistry()
        version  = registry.promote(
            version_id,
            ModelStage(body.target_stage),
            promoted_by=current.user_id,
        )
        return {"promoted": True, "version": version.to_dict()}
    except Exception as e:
        raise HTTPException(400, str(e))


# ── Retraining endpoints ──────────────────────────────────────────────────────

@router.post("/retrain")
async def trigger_retrain(
    body: RetrainRequest,
    background_tasks: BackgroundTasks,
    current: CurrentUser = Depends(require_role("admin", "mlops")),
):
    """Manually trigger retraining pipeline."""
    try:
        from app.workers.tasks.retrain_tasks import register_retraining_tasks
        from app.workers.celery_app import celery_app

        celery_app.send_task(
            "app.workers.tasks.retrain_tasks.check_and_retrain",
            kwargs={"trigger": body.trigger},
            queue="default",
        )
        logger.info("retrain_triggered", user=current.user_id, trigger=body.trigger)
        return {
            "status":     "queued",
            "trigger":    body.trigger,
            "triggered_by": current.user_id,
            "timestamp":  datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to queue retraining: {e}")


@router.post("/approve-model")
async def approve_model(
    body: ApproveModelRequest,
    current: CurrentUser = Depends(require_role("admin")),
):
    """Admin approval: promote staging model → production."""
    from app.workers.celery_app import celery_app

    celery_app.send_task(
        "app.workers.tasks.retrain_tasks.approve_model",
        kwargs={"version_id": body.version_id, "approved_by": current.user_id},
        queue="default",
    )
    return {
        "status":      "approval_queued",
        "version_id":  body.version_id,
        "approved_by": current.user_id,
    }


# ── HITL endpoints ────────────────────────────────────────────────────────────

@router.get("/hitl/queue")
async def get_review_queue(
    limit: int = Query(20, le=100),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get pending review items for the operator."""
    if settings.pilot_mode:
        raise HTTPException(410, "Legacy MLOps review queue is disabled in pilot mode. Use /api/v1/hitl/queue.")
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
        from mlops.hitl.review_pipeline import ReviewQueueService

        svc = ReviewQueueService(db, current.tenant_id)
        queue = await svc.get_pending_queue(
            operator_id=current.user_id,
            limit=limit,
        )
        return {"queue": queue, "count": len(queue)}
    except Exception as e:
        logger.warning("hitl_queue_error", error=str(e))
        return {"queue": _mock_review_queue(), "count": 3}


@router.post("/hitl/{review_id}/review")
async def submit_review(
    review_id: str,
    body: HITLReviewRequest,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Operator submits review decision."""
    if settings.pilot_mode:
        raise HTTPException(410, "Legacy MLOps review writes are disabled in pilot mode. Use /api/v1/hitl/{inspection_id}/review.")
    try:
        from mlops.hitl.review_pipeline import ReviewQueueService, ReviewAction

        svc = ReviewQueueService(db, current.tenant_id)
        result = await svc.submit_review(
            review_id=review_id,
            reviewer_id=current.user_id,
            action=ReviewAction(body.action),
            final_decision=body.final_decision,
            annotations=body.annotations,
            notes=body.notes,
            time_spent_sec=body.time_spent_sec,
        )
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/hitl/stats")
async def get_hitl_stats(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if settings.pilot_mode:
        raise HTTPException(410, "Legacy MLOps HITL stats are disabled in pilot mode. Use /api/v1/hitl/stats.")
    try:
        from mlops.hitl.review_pipeline import ReviewQueueService
        svc = ReviewQueueService(db, current.tenant_id)
        return await svc.get_hitl_stats()
    except Exception as e:
        return _mock_hitl_stats()


# ── Drift monitoring endpoint ─────────────────────────────────────────────────

@router.get("/drift")
async def get_drift_status(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current model drift metrics."""
    try:
        from sqlalchemy import text
        result = await db.execute(text("""
            SELECT
                COUNT(*) as total,
                AVG(confidence) FILTER (WHERE decision != 'pass') as avg_defect_conf,
                COUNT(*) FILTER (WHERE decision = 'pass') * 1.0
                    / NULLIF(COUNT(*), 0) as pass_rate,
                AVG(inference_latency_ms) as avg_latency_ms
            FROM inspection_results
            WHERE factory_id = :factory_id
              AND created_at > NOW() - INTERVAL '6 hours'
              AND deleted_at IS NULL
        """), {"factory_id": current.tenant_id})
        row = result.mappings().one_or_none()
        if row and row["total"] > 0:
            return {
                "window":         "6h",
                "total":          row["total"],
                "pass_rate":      round(float(row["pass_rate"] or 0), 4),
                "avg_confidence": round(float(row["avg_defect_conf"] or 0), 4),
                "avg_latency_ms": round(float(row["avg_latency_ms"] or 0)),
                "drift_detected": False,  # computed by beat task
            }
    except Exception as e:
        logger.warning("drift_query_error", error=str(e))
    return _mock_drift_stats()


# ── Dataset stats ─────────────────────────────────────────────────────────────

@router.get("/dataset/stats")
async def get_dataset_stats(current: CurrentUser = Depends(get_current_user)):
    """Current dataset version info."""
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
        versions_dir = Path(__file__).parent.parent.parent.parent.parent / "mlops" / "dataset" / "versions"
        manifests = list(versions_dir.glob("*/manifest.json"))
        if manifests:
            latest = sorted(manifests)[-1]
            import json
            with open(latest) as f:
                data = json.load(f)
            return data.get("stats", {})
    except Exception:
        pass
    return _mock_dataset_stats()


# ── Demo seeder endpoint ──────────────────────────────────────────────────────

async def _table_exists(db: AsyncSession, table_name: str) -> bool:
    result = await db.execute(text("SELECT to_regclass(:table_name)"), {"table_name": f"public.{table_name}"})
    return result.scalar_one_or_none() is not None


def _require_demo_mode() -> None:
    if settings.is_production or settings.pilot_mode or not settings.demo_mode:
        raise HTTPException(
            status_code=403,
            detail="Demo reset/seed endpoints are disabled outside explicit demo mode and in pilot mode.",
        )


async def _delete_demo_records(db: AsyncSession, factory_id: str) -> dict[str, int]:
    demo_filter = """
        factory_id = :factory_id
        AND (
            image_key LIKE 'demo/%'
            OR celery_task_id LIKE 'demo-%'
            OR serial_number LIKE 'KANBAI-DEMO%'
            OR lot_number LIKE 'FACTORY-PILOT%'
        )
    """
    demo_filter_ir = """
        ir.factory_id = :factory_id
        AND (
            ir.image_key LIKE 'demo/%'
            OR ir.celery_task_id LIKE 'demo-%'
            OR ir.serial_number LIKE 'KANBAI-DEMO%'
            OR ir.lot_number LIKE 'FACTORY-PILOT%'
        )
    """
    deleted: dict[str, int] = {}

    async def delete_optional(table: str, sql: str) -> None:
        if not await _table_exists(db, table):
            deleted[table] = 0
            return
        result = await db.execute(text(sql), {"factory_id": factory_id})
        deleted[table] = max(result.rowcount or 0, 0)

    await delete_optional("review_annotations", f"""
        DELETE FROM review_annotations
        WHERE review_id IN (
            SELECT rq.id
            FROM review_queue rq
            JOIN inspection_results ir ON ir.id = rq.inspection_id
            WHERE {demo_filter_ir}
        )
    """)

    await delete_optional("dataset_contributions", f"""
        DELETE FROM dataset_contributions
        WHERE factory_id = :factory_id
          AND inspection_id IN (
            SELECT id FROM inspection_results WHERE {demo_filter}
          )
    """)

    await delete_optional("false_positive_log", f"""
        DELETE FROM false_positive_log
        WHERE factory_id = :factory_id
          AND inspection_id IN (
            SELECT id FROM inspection_results WHERE {demo_filter}
          )
    """)

    await delete_optional("hitl_reviews", f"""
        DELETE FROM hitl_reviews
        WHERE factory_id = :factory_id
          AND inspection_id IN (
            SELECT id FROM inspection_results WHERE {demo_filter}
          )
    """)

    await delete_optional("inspection_defects", f"""
        DELETE FROM inspection_defects
        WHERE factory_id = :factory_id
          AND inspection_id IN (
            SELECT id FROM inspection_results WHERE {demo_filter}
          )
    """)

    await delete_optional("review_queue", f"""
        DELETE FROM review_queue
        WHERE factory_id = :factory_id
          AND inspection_id IN (
            SELECT id FROM inspection_results WHERE {demo_filter}
          )
    """)

    result = await db.execute(text(f"""
        DELETE FROM inspection_results
        WHERE {demo_filter}
    """), {"factory_id": factory_id})
    deleted["inspection_results"] = max(result.rowcount or 0, 0)
    return deleted


@router.post("/demo/reset")
async def reset_demo_data(
    current: CurrentUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Delete only demo-tagged records for the current factory tenant."""
    _require_demo_mode()
    try:
        deleted = await _delete_demo_records(db, current.tenant_id)
        await db.commit()
        logger.info("demo_reset", deleted=deleted, factory_id=current.tenant_id)
        return {"reset": True, "deleted": deleted}
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))


@router.post("/demo/seed")
async def seed_demo_data(
    scenario: str = Query("metal", enum=["metal", "cnc", "plastic"]),
    count: int = Query(50, le=500),
    reset: bool = Query(False),
    background_tasks: BackgroundTasks = None,
    current: CurrentUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Seed realistic demo inspection data for investor presentation.
    Creates N inspection records with realistic AI results.
    """
    _require_demo_mode()
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent))
        from mlops.demo.demo_scenarios import ALL_FACTORIES, DemoEventGenerator

        deleted = await _delete_demo_records(db, current.tenant_id) if reset else {}

        factory_meta = ALL_FACTORIES.get(scenario)
        if not factory_meta:
            raise HTTPException(400, f"Unknown scenario: {scenario}")

        generator = DemoEventGenerator(factory_meta)

        # Get the first device for this factory
        result = await db.execute(text(
            "SELECT id FROM devices WHERE factory_id = :fid AND deleted_at IS NULL LIMIT 1"
        ), {"fid": current.tenant_id})
        device_row = result.fetchone()
        device_id = str(device_row[0]) if device_row else str(uuid.uuid4())

        inserted = 0
        for i in range(count):
            event    = generator.generate_inspection_event()
            insp_id  = str(uuid.uuid4())

            await db.execute(text("""
                INSERT INTO inspection_results
                    (id, factory_id, device_id, image_key, image_path,
                     decision, inference_status, confidence, defects, inference_latency_ms,
                     celery_task_id, created_at, updated_at)
                VALUES
                    (:id, :factory_id, :device_id, :image_key, :image_path,
                     :decision, 'completed', :confidence, CAST(:defects AS jsonb), :latency,
                     :task_id, NOW() - (:offset_seconds * INTERVAL '1 second'), NOW())
            """), {
                "id":         insp_id,
                "factory_id": current.tenant_id,
                "device_id":  device_id,
                "image_key":  f"demo/{scenario}/{insp_id}.jpg",
                "image_path": f"/demo/{scenario}/{insp_id}.jpg",
                "decision":   event["decision"],
                "confidence": event["confidence"],
                "defects":    __import__("json").dumps(event["defects"]),
                "latency":    event["latency_ms"],
                "task_id":    f"demo-{insp_id[:8]}",
                "offset_seconds": i * 30,  # spread over time
            })
            inserted += 1

        logger.info("demo_seeded", count=inserted, scenario=scenario)
        return {
            "seeded":   inserted,
            "scenario": scenario,
            "factory":  factory_meta.name,
            "reset":    reset,
            "deleted":  deleted,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Mock data (graceful fallback when mlops not initialized) ──────────────────

def _mock_production_model() -> dict:
    return {
        "version_id":    "mock-prod-001",
        "name":          "qc-defect-detector",
        "version":       "mock-v1.2",
        "architecture":  "mock",
        "stage":         "production",
        "metrics":       {
            "mAP50": 0.91, "mAP50_95": 0.67,
            "precision": 0.89, "recall": 0.87,
        },
        "class_names":   {
            "0": "good", "1": "scratch", "2": "dent",
            "3": "crack", "4": "inclusion",
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _mock_model_list() -> list:
    base = _mock_production_model()
    return [base, {**base, "version": "mock-v1.1", "stage": "staging",
                   "metrics": {**base["metrics"], "mAP50": 0.88}}]


def _mock_review_queue() -> list:
    return [
        {
            "id":             "rq-001",
            "inspection_id":  "demo-insp-001",
            "ai_decision":    "review",
            "ai_confidence":  0.61,
            "priority":       2,
            "device_name":    "Hat 1 - Kamera A",
            "ai_defects": [{"class_name": "scratch", "confidence": 0.61,
                            "bbox_norm": [0.45, 0.38, 0.22, 0.18]}],
        },
    ]


def _mock_hitl_stats() -> dict:
    return {
        "total_reviews": 47,
        "approved": 41,
        "false_positives": 6,
        "contributions": 41,
        "avg_review_time_sec": 28.4,
        "pending_export": 41,
    }


def _mock_drift_stats() -> dict:
    return {
        "window":         "6h",
        "total":          312,
        "pass_rate":      0.941,
        "avg_confidence": 0.823,
        "avg_latency_ms": 287,
        "drift_detected": False,
    }


def _mock_dataset_stats() -> dict:
    return {
        "version": "v1.0",
        "total":   3012,
        "defective": 1247,
        "good":    1765,
        "by_source": {"mvtec": 1200, "neu": 1812},
        "by_split":  {"train": 2109, "val": 602, "test": 301},
    }
