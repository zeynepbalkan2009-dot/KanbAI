"""
Automated Retraining Pipeline
================================
Triggered by:
  1. Celery Beat schedule (weekly, Sunday 02:00)
  2. HITL threshold reached (200+ new contributions)
  3. Drift detection alert (confidence shift > 0.15)
  4. Manual API trigger (POST /api/v1/mlops/retrain)

Pipeline steps:
  1. Export new HITL contributions → YOLO format
  2. Merge with base dataset (MVTec/NEU)
  3. Run augmentation
  4. Train YOLOv8 (fine-tune from current production model)
  5. Evaluate on holdout test set
  6. Gate: mAP50 must not drop > 0.02
  7. Register new version
  8. Promote to staging → notify admin
  9. Admin approves → promote to production
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from celery import Task
from celery.utils.log import get_task_logger
from celery.schedules import crontab

logger = get_task_logger(__name__)

MLOPS_DIR    = Path(__file__).parent.parent.parent.parent / "mlops"
REGISTRY_DIR = MLOPS_DIR / "registry"
DATASET_DIR  = MLOPS_DIR / "dataset"
MODELS_DIR   = MLOPS_DIR / "inference" / "models"


def register_retraining_tasks(celery_app):
    """Register all retraining tasks + beat schedule."""

    # ── Beat schedule ──────────────────────────────────────────────────────
    celery_app.conf.beat_schedule.update({
        "weekly-retrain": {
            "task":     "app.workers.tasks.retrain_tasks.check_and_retrain",
            "schedule": crontab(hour=2, minute=0, day_of_week="sunday"),
            "kwargs":   {"trigger": "scheduled"},
        },
        "hourly-drift-check": {
            "task":     "app.workers.tasks.retrain_tasks.check_drift",
            "schedule": crontab(minute=0),  # every hour
        },
    })

    # ── Tasks ──────────────────────────────────────────────────────────────

    @celery_app.task(
        name="app.workers.tasks.retrain_tasks.check_and_retrain",
        queue="default",
        max_retries=1,
    )
    def check_and_retrain(trigger: str = "manual") -> dict:
        """
        Master retraining orchestrator.
        Checks if retraining is warranted, then runs full pipeline.
        """
        logger.info(f"[retrain] check triggered by: {trigger}")

        if os.environ.get("PILOT_MODE", "false").strip().lower() in {"1", "true", "yes", "on"}:
            logger.warning("[retrain] disabled in pilot mode: collected labels require dataset QA and explicit approval")
            return {
                "skipped": True,
                "reason": "pilot_data_collection_only",
                "automatic_training_enabled": False,
            }

        db = _get_db()
        try:
            # 1. Count unexported contributions
            count = _count_pending_contributions(db)
            logger.info(f"[retrain] pending contributions: {count}")

            threshold = int(os.environ.get("RETRAIN_THRESHOLD", "200"))
            if trigger == "scheduled" and count < threshold:
                logger.info(f"[retrain] not enough data ({count} < {threshold}), skipping")
                return {"skipped": True, "reason": "insufficient_data", "count": count}

            # 2. Export HITL dataset
            export_result = _export_hitl_dataset(db)
            if export_result["exported"] == 0 and trigger == "hitl_threshold":
                return {"skipped": True, "reason": "no_new_data"}

            # 3. Run training
            version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}"
            train_result = _run_training(version, export_result.get("output_dir", ""))

            # 4. Evaluate vs current production
            gate_result = _quality_gate(train_result)
            if not gate_result["passed"]:
                logger.error(f"[retrain] quality gate FAILED: {gate_result}")
                _notify_slack(f"⚠️ Retraining quality gate failed: {gate_result}")
                return {"failed": True, "gate": gate_result}

            # 5. Register + promote to staging
            _register_and_promote(train_result, version)

            # 6. Notify for human approval
            _notify_admin_approval_needed(train_result, gate_result)

            logger.info(f"[retrain] pipeline complete: version={version}")
            return {
                "success":  True,
                "version":  version,
                "metrics":  train_result.get("metrics", {}),
                "gate":     gate_result,
                "trigger":  trigger,
            }

        except Exception as e:
            logger.error(f"[retrain] pipeline error: {e}")
            raise
        finally:
            db.close()

    @celery_app.task(
        name="app.workers.tasks.retrain_tasks.check_drift",
        queue="default",
    )
    def check_drift() -> dict:
        """Hourly drift check — triggers retraining if threshold exceeded."""
        db = _get_db()
        try:
            stats = _get_recent_inference_stats(db, window=1000)
            if stats["total"] < 100:
                return {"skipped": True, "reason": "insufficient_window"}

            # Simple drift: recent pass_rate vs 7-day baseline
            recent_pass_rate   = stats["recent_pass_rate"]
            baseline_pass_rate = stats["baseline_pass_rate"]
            drift = abs(recent_pass_rate - baseline_pass_rate)

            logger.info(
                f"[drift] recent={recent_pass_rate:.3f} "
                f"baseline={baseline_pass_rate:.3f} "
                f"drift={drift:.3f}"
            )

            threshold = float(os.environ.get("DRIFT_THRESHOLD", "0.15"))
            if drift > threshold:
                logger.warning(f"[drift] ALERT: drift={drift:.3f} > threshold={threshold}")
                _notify_slack(
                    f"🚨 Model drift detected!\n"
                    f"  Recent pass rate:   {recent_pass_rate:.1%}\n"
                    f"  Baseline pass rate: {baseline_pass_rate:.1%}\n"
                    f"  Drift magnitude:    {drift:.3f}\n"
                    f"  Action: Retraining queued"
                )
                # Queue retraining
                celery_app.send_task(
                    "app.workers.tasks.retrain_tasks.check_and_retrain",
                    kwargs={"trigger": "drift_detection"},
                    queue="default",
                )
                return {"drift_detected": True, "drift": drift}

            return {"drift_detected": False, "drift": drift}
        finally:
            db.close()

    @celery_app.task(
        name="app.workers.tasks.retrain_tasks.approve_model",
        queue="default",
    )
    def approve_model(version_id: str, approved_by: str) -> dict:
        """Admin approves staging → production promotion."""
        try:
            sys_path_fix()
            from mlops.registry.model_registry import ModelRegistry, ModelStage

            registry = ModelRegistry()
            version  = registry.promote(version_id, ModelStage.PRODUCTION, promoted_by=approved_by)
            logger.info(f"[approve] promoted to production: {version.version}")

            # Hot-reload the inference service
            _signal_model_reload(version.onnx_path or version.pytorch_path)

            return {"promoted": True, "version": version.version}
        except Exception as e:
            logger.error(f"[approve] error: {e}")
            raise

    return check_and_retrain, check_drift, approve_model


# ── Internal helpers ──────────────────────────────────────────────────────────

def sys_path_fix():
    import sys
    root = str(Path(__file__).parent.parent.parent.parent)
    if root not in sys.path:
        sys.path.insert(0, root)


def _get_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    url = os.environ["DATABASE_URL"].replace("+asyncpg", "+psycopg2").replace(
        "postgresql://", "postgresql+psycopg2://"
    )
    engine = create_engine(url, pool_pre_ping=True)
    return sessionmaker(bind=engine)()


def _count_pending_contributions(db) -> int:
    from sqlalchemy import text
    try:
        result = db.execute(text(
            "SELECT COUNT(*) FROM dataset_contributions WHERE exported_at IS NULL"
        ))
        return result.scalar() or 0
    except Exception:
        return 0


def _export_hitl_dataset(db) -> dict:
    """Export pending HITL contributions to YOLO format."""
    sys_path_fix()
    import asyncio
    from mlops.hitl.review_pipeline import HITLDatasetExporter
    from minio import Minio

    version = f"hitl_{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    output_dir = DATASET_DIR / "augmented" / version

    try:
        minio = Minio(
            os.environ["MINIO_ENDPOINT"],
            access_key=os.environ["MINIO_ACCESS_KEY"],
            secret_key=os.environ["MINIO_SECRET_KEY"],
            secure=False,
        )
        exporter = HITLDatasetExporter(minio, output_dir)
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(exporter.export(db, "*", version))
        loop.close()
        result["output_dir"] = str(output_dir)
        return result
    except Exception as e:
        logger.warning(f"[export] failed: {e}, using base dataset only")
        return {"exported": 0, "output_dir": ""}


def _run_training(version: str, hitl_dir: str) -> dict:
    sys_path_fix()
    from mlops.training.scripts.train import YOLOTrainer

    # Get current production model for fine-tuning
    prod_model = _get_production_model_path()
    base_model = prod_model or "yolov8n.pt"

    # Use merged dataset (base + HITL)
    data_yaml = _build_merged_data_yaml(hitl_dir)

    trainer = YOLOTrainer(
        data_yaml=data_yaml,
        model=base_model,
        epochs=50,             # fewer epochs for fine-tuning
        batch=16,
        experiment="auto_retrain",
        run_name=f"retrain_{version}",
        device="auto",
    )
    return trainer.train()


def _quality_gate(train_result: dict) -> dict:
    """
    Hard gate: new model must not be significantly worse than current production.
    mAP50 drop tolerance: 0.02
    """
    sys_path_fix()
    from mlops.registry.model_registry import ModelRegistry, ModelStage

    registry  = ModelRegistry()
    prod_model = registry.get_production_model()

    new_map50  = train_result.get("metrics", {}).get("mAP50", 0.0)
    prod_map50 = prod_model.metrics.mAP50 if prod_model else 0.0

    drop = prod_map50 - new_map50
    passed = drop <= 0.02  # allow max 2% drop

    return {
        "passed":       passed,
        "new_mAP50":    round(new_map50, 4),
        "prod_mAP50":   round(prod_map50, 4),
        "drop":         round(drop, 4),
        "tolerance":    0.02,
    }


def _register_and_promote(train_result: dict, version: str):
    sys_path_fix()
    from mlops.registry.model_registry import (
        ModelRegistry, ModelVersion, ModelMetrics, ModelStage
    )
    import uuid

    metrics = train_result.get("metrics", {})
    exports = train_result.get("export", {})

    mv = ModelVersion(
        version_id=str(uuid.uuid4()),
        name="qc-defect-detector",
        version=version,
        architecture="yolov8n",
        stage=ModelStage.STAGING,
        metrics=ModelMetrics(
            mAP50=metrics.get("mAP50", 0),
            mAP50_95=metrics.get("mAP50_95", 0),
            precision=metrics.get("precision", 0),
            recall=metrics.get("recall", 0),
        ),
        onnx_path=exports.get("onnx"),
        pytorch_path=exports.get("pytorch"),
    )
    registry = ModelRegistry()
    registry.register(mv)
    logger.info(f"[register] staging version: {version}")


def _get_production_model_path() -> Optional[str]:
    sys_path_fix()
    from mlops.registry.model_registry import ModelRegistry
    registry = ModelRegistry()
    prod = registry.get_production_model()
    if prod:
        return prod.onnx_path or prod.pytorch_path
    return None


def _build_merged_data_yaml(hitl_dir: str) -> str:
    """Merge base dataset + HITL exports into one data.yaml."""
    base_yaml = DATASET_DIR / "yolo" / "v1.0" / "binary" / "data.yaml"
    if not hitl_dir or not Path(hitl_dir).exists():
        return str(base_yaml)
    # For now, return base dataset; full merge logic in phase 2
    return str(base_yaml) if base_yaml.exists() else "dataset/yolo/v1.0/binary/data.yaml"


def _get_recent_inference_stats(db, window: int = 1000) -> dict:
    from sqlalchemy import text
    try:
        result = db.execute(text(f"""
            WITH recent AS (
                SELECT decision FROM inspection_results
                WHERE created_at > NOW() - INTERVAL '6 hours'
                ORDER BY created_at DESC LIMIT {window}
            ),
            baseline AS (
                SELECT decision FROM inspection_results
                WHERE created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '6 hours'
                ORDER BY created_at DESC LIMIT {window * 5}
            )
            SELECT
                COUNT(*) FILTER (WHERE r.decision = 'pass') * 1.0
                    / NULLIF(COUNT(*), 0) AS recent_pass_rate,
                COUNT(*) AS recent_total,
                (SELECT COUNT(*) FILTER (WHERE decision = 'pass') * 1.0
                        / NULLIF(COUNT(*), 0) FROM baseline) AS baseline_pass_rate
            FROM recent r
        """))
        row = result.mappings().one_or_none()
        if row:
            return {
                "recent_pass_rate":   float(row["recent_pass_rate"] or 0),
                "baseline_pass_rate": float(row["baseline_pass_rate"] or 0),
                "total": row["recent_total"] or 0,
            }
    except Exception:
        pass
    return {"recent_pass_rate": 0.95, "baseline_pass_rate": 0.95, "total": 0}


def _notify_slack(message: str):
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        logger.info(f"[notify] {message}")
        return
    try:
        import urllib.request, json
        data = json.dumps({"text": message}).encode()
        req = urllib.request.Request(webhook, data=data,
                                      headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.warning(f"[notify] slack failed: {e}")


def _notify_admin_approval_needed(train_result: dict, gate_result: dict):
    msg = (
        f"✅ New model ready for approval!\n"
        f"  mAP50: {gate_result['new_mAP50']:.4f} "
        f"(prod: {gate_result['prod_mAP50']:.4f})\n"
        f"  Action: POST /api/v1/mlops/approve-model"
    )
    _notify_slack(msg)


def _signal_model_reload(model_path: Optional[str]):
    """Signal all workers to reload inference model."""
    if not model_path:
        return
    reload_key = "model:reload:signal"
    import redis
    r = redis.from_url(os.environ["REDIS_URL"])
    r.set(reload_key, model_path)
    r.publish("model:reload", model_path)
    r.close()
    logger.info(f"[reload] signaled: {model_path}")
