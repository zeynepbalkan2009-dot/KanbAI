"""
Human-in-the-Loop Pipeline
============================
Converts operator corrections → proprietary training dataset.

Flow:
  1. AI produces "review" decision (low confidence)
  2. InspectionResult → ReviewQueue (Celery task)
  3. Operator sees review queue in dashboard
  4. Operator confirms/corrects:
     a. Confirm AI bbox (accept annotation)
     b. Adjust bbox (correct annotation)
     c. Add missed defect (new annotation)
     d. Mark as "good" (false positive → negative example)
  5. Approved annotation → DatasetContribution table
  6. Weekly: accumulate N contributions → trigger retraining pipeline

This is the proprietary data flywheel:
  More factory data → better models → more accurate → fewer reviews → less operator time
"""

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional
import json


# ── Domain enums ─────────────────────────────────────────────────────────────

class ReviewAction(str, Enum):
    CONFIRM_AI       = "confirm_ai"        # AI was right
    CORRECT_BBOX     = "correct_bbox"      # AI found it, wrong location
    ADD_DEFECT       = "add_defect"        # AI missed a defect
    MARK_GOOD        = "mark_good"         # AI false positive
    ESCALATE         = "escalate"          # send to senior operator


class ReviewStatus(str, Enum):
    PENDING    = "pending"
    IN_REVIEW  = "in_review"
    APPROVED   = "approved"
    REJECTED   = "rejected"
    ESCALATED  = "escalated"


# ── DB Models (SQLAlchemy) ────────────────────────────────────────────────────
# Add these to infrastructure/database/models.py

HITL_MODELS_SQL = '''
-- Review queue items
CREATE TABLE IF NOT EXISTS review_queue (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id       UUID NOT NULL REFERENCES factories(id),
    inspection_id    UUID NOT NULL REFERENCES inspection_results(id),
    assigned_to      UUID REFERENCES users(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    ai_decision      VARCHAR(20) NOT NULL,
    ai_confidence    FLOAT,
    ai_defects       JSONB,
    priority         INTEGER DEFAULT 5,  -- 1=urgent, 10=low
    due_by           TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_review_inspection UNIQUE (inspection_id)
);

CREATE INDEX ix_review_factory_status ON review_queue (factory_id, status);
CREATE INDEX ix_review_priority ON review_queue (status, priority, created_at);

-- Operator annotation corrections
CREATE TABLE IF NOT EXISTS review_annotations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id        UUID NOT NULL REFERENCES review_queue(id),
    reviewer_id      UUID NOT NULL REFERENCES users(id),
    action           VARCHAR(30) NOT NULL,  -- ReviewAction
    final_decision   VARCHAR(20) NOT NULL,  -- pass | fail
    annotations      JSONB,  -- [{class_id, class_name, bbox_norm, confidence:1.0}]
    notes            TEXT,
    time_spent_sec   INTEGER,  -- gamification + quality tracking
    reviewed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approved samples ready for dataset contribution
CREATE TABLE IF NOT EXISTS dataset_contributions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id       UUID NOT NULL REFERENCES factories(id),
    inspection_id    UUID NOT NULL REFERENCES inspection_results(id),
    review_id        UUID REFERENCES review_queue(id),
    image_key        VARCHAR(500) NOT NULL,
    final_decision   VARCHAR(20) NOT NULL,
    annotations      JSONB NOT NULL,
    source           VARCHAR(30) NOT NULL DEFAULT 'hitl',  -- hitl | auto_approved
    dataset_version  VARCHAR(50),  -- filled when exported
    exported_at      TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_contributions_factory ON dataset_contributions (factory_id, exported_at);

-- Model false positive tracking
CREATE TABLE IF NOT EXISTS false_positive_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id       UUID NOT NULL REFERENCES factories(id),
    inspection_id    UUID NOT NULL REFERENCES inspection_results(id),
    model_version    VARCHAR(100),
    ai_class         VARCHAR(100),
    ai_confidence    FLOAT,
    reviewer_id      UUID,
    logged_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
'''


# ── Review Queue Service ──────────────────────────────────────────────────────

class ReviewQueueService:
    """
    Manages the HITL review pipeline.
    Called by:
      - Celery worker (create_review_item)
      - API endpoints (get_queue, submit_review)
    """

    def __init__(self, db, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def create_review_item(
        self,
        inspection_id: str,
        ai_decision: str,
        ai_confidence: float,
        ai_defects: list,
        priority: int = 5,
    ) -> str:
        """Create a review queue item for operator attention."""
        from sqlalchemy import text
        item_id = str(uuid.uuid4())

        # Priority escalation rules
        if ai_confidence < 0.55:
            priority = 2   # very uncertain → high priority
        elif ai_decision == "fail" and ai_confidence < 0.65:
            priority = 3   # possible false positive

        await self.db.execute(text("""
            INSERT INTO review_queue
                (id, factory_id, inspection_id, status, ai_decision,
                 ai_confidence, ai_defects, priority)
            VALUES
                (:id, :factory_id, :inspection_id, 'pending', :ai_decision,
                 :ai_confidence, :ai_defects::jsonb, :priority)
            ON CONFLICT (inspection_id) DO NOTHING
        """), {
            "id":            item_id,
            "factory_id":    self.tenant_id,
            "inspection_id": inspection_id,
            "ai_decision":   ai_decision,
            "ai_confidence": ai_confidence,
            "ai_defects":    json.dumps(ai_defects),
            "priority":      priority,
        })
        return item_id

    async def get_pending_queue(
        self, operator_id: Optional[str] = None, limit: int = 20
    ) -> list[dict]:
        from sqlalchemy import text
        result = await self.db.execute(text("""
            SELECT
                rq.id, rq.inspection_id, rq.ai_decision, rq.ai_confidence,
                rq.ai_defects, rq.priority, rq.created_at,
                ir.image_key, ir.image_path,
                d.name as device_name
            FROM review_queue rq
            JOIN inspection_results ir ON ir.id = rq.inspection_id
            JOIN devices d ON d.id = ir.device_id
            WHERE rq.factory_id = :factory_id
              AND rq.status IN ('pending', 'in_review')
              AND (:operator_id IS NULL OR rq.assigned_to = :operator_id OR rq.assigned_to IS NULL)
            ORDER BY rq.priority ASC, rq.created_at ASC
            LIMIT :limit
        """), {
            "factory_id":  self.tenant_id,
            "operator_id": operator_id,
            "limit":       limit,
        })
        return [dict(row) for row in result.mappings()]

    async def submit_review(
        self,
        review_id: str,
        reviewer_id: str,
        action: ReviewAction,
        final_decision: str,
        annotations: list,
        notes: Optional[str] = None,
        time_spent_sec: Optional[int] = None,
    ) -> dict:
        """
        Operator submits their review.
        Automatically contributes to dataset if approved.
        """
        from sqlalchemy import text

        # 1. Save annotation
        annotation_id = str(uuid.uuid4())
        await self.db.execute(text("""
            INSERT INTO review_annotations
                (id, review_id, reviewer_id, action, final_decision,
                 annotations, notes, time_spent_sec)
            VALUES
                (:id, :review_id, :reviewer_id, :action, :final_decision,
                 :annotations::jsonb, :notes, :time_spent_sec)
        """), {
            "id":             annotation_id,
            "review_id":      review_id,
            "reviewer_id":    reviewer_id,
            "action":         action.value,
            "final_decision": final_decision,
            "annotations":    json.dumps(annotations),
            "notes":          notes,
            "time_spent_sec": time_spent_sec,
        })

        # 2. Update queue status
        new_status = ReviewStatus.APPROVED.value
        await self.db.execute(text("""
            UPDATE review_queue
            SET status = :status, assigned_to = :reviewer_id,
                updated_at = NOW()
            WHERE id = :review_id
        """), {"status": new_status, "reviewer_id": reviewer_id, "review_id": review_id})

        # 3. Contribute to dataset (if not escalated)
        if action != ReviewAction.ESCALATE:
            await self._contribute_to_dataset(review_id, reviewer_id, final_decision, annotations)

        # 4. Log false positives
        if action == ReviewAction.MARK_GOOD:
            await self._log_false_positive(review_id, reviewer_id)

        # 5. Check retraining trigger
        trigger = await self._check_retraining_trigger()

        return {
            "annotation_id": annotation_id,
            "status":        new_status,
            "retraining_triggered": trigger,
        }

    async def _contribute_to_dataset(
        self, review_id: str, reviewer_id: str,
        final_decision: str, annotations: list
    ):
        from sqlalchemy import text
        # Get inspection details
        result = await self.db.execute(text("""
            SELECT ir.id, ir.image_key, rq.factory_id
            FROM review_queue rq
            JOIN inspection_results ir ON ir.id = rq.inspection_id
            WHERE rq.id = :review_id
        """), {"review_id": review_id})
        row = result.mappings().one_or_none()
        if not row:
            return

        await self.db.execute(text("""
            INSERT INTO dataset_contributions
                (id, factory_id, inspection_id, review_id, image_key,
                 final_decision, annotations, source)
            VALUES
                (:id, :factory_id, :inspection_id, :review_id, :image_key,
                 :final_decision, :annotations::jsonb, 'hitl')
            ON CONFLICT DO NOTHING
        """), {
            "id":             str(uuid.uuid4()),
            "factory_id":     str(row["factory_id"]),
            "inspection_id":  str(row["id"]),
            "review_id":      review_id,
            "image_key":      row["image_key"],
            "final_decision": final_decision,
            "annotations":    json.dumps(annotations),
        })

    async def _log_false_positive(self, review_id: str, reviewer_id: str):
        from sqlalchemy import text
        await self.db.execute(text("""
            INSERT INTO false_positive_log
                (id, factory_id, inspection_id, reviewer_id)
            SELECT gen_random_uuid(), rq.factory_id, rq.inspection_id, :reviewer_id
            FROM review_queue rq WHERE rq.id = :review_id
        """), {"review_id": review_id, "reviewer_id": reviewer_id})

    async def _check_retraining_trigger(self) -> bool:
        """Trigger retraining every N new contributions."""
        from sqlalchemy import text
        RETRAINING_THRESHOLD = 200  # tune per factory

        result = await self.db.execute(text("""
            SELECT COUNT(*) FROM dataset_contributions
            WHERE factory_id = :factory_id AND exported_at IS NULL
        """), {"factory_id": self.tenant_id})
        count = result.scalar()

        if count >= RETRAINING_THRESHOLD:
            # TODO: trigger Celery retraining task
            return True
        return False

    async def get_hitl_stats(self) -> dict:
        """Operator performance + dataset growth metrics."""
        from sqlalchemy import text
        result = await self.db.execute(text("""
            SELECT
                COUNT(DISTINCT rq.id)                                    AS total_reviews,
                COUNT(DISTINCT rq.id) FILTER (WHERE rq.status='approved') AS approved,
                COUNT(DISTINCT fp.id)                                    AS false_positives,
                COUNT(DISTINCT dc.id)                                    AS contributions,
                AVG(ra.time_spent_sec)                                   AS avg_review_time_sec,
                COUNT(DISTINCT dc.id) FILTER (WHERE dc.exported_at IS NULL) AS pending_export
            FROM review_queue rq
            LEFT JOIN review_annotations ra  ON ra.review_id = rq.id
            LEFT JOIN dataset_contributions dc ON dc.review_id = rq.id
            LEFT JOIN false_positive_log fp ON fp.factory_id = rq.factory_id
            WHERE rq.factory_id = :factory_id
        """), {"factory_id": self.tenant_id})
        row = result.mappings().one()
        return dict(row)


# ── Dataset export for retraining ─────────────────────────────────────────────

class HITLDatasetExporter:
    """Export accumulated HITL contributions as YOLO dataset."""

    def __init__(self, minio_client, output_dir: Path):
        self.minio = minio_client
        self.output_dir = output_dir

    async def export(self, db, tenant_id: str, version: str) -> dict:
        from sqlalchemy import text

        result = await db.execute(text("""
            SELECT dc.*, ir.image_key
            FROM dataset_contributions dc
            JOIN inspection_results ir ON ir.id = dc.inspection_id
            WHERE dc.factory_id = :tenant_id
              AND dc.exported_at IS NULL
            ORDER BY dc.created_at
        """), {"tenant_id": tenant_id})
        rows = list(result.mappings())

        if not rows:
            return {"exported": 0}

        out_imgs = self.output_dir / "images" / "train"
        out_lbls = self.output_dir / "labels" / "train"
        out_imgs.mkdir(parents=True, exist_ok=True)
        out_lbls.mkdir(parents=True, exist_ok=True)

        exported = 0
        for row in rows:
            try:
                # Download from MinIO
                img_name = f"hitl_{row['id']}.jpg"
                img_path = out_imgs / img_name
                self.minio.fget_object("inspections", row["image_key"], str(img_path))

                # Write YOLO label
                lbl_path = out_lbls / f"hitl_{row['id']}.txt"
                annotations = row["annotations"] or []
                lines = []
                for ann in annotations:
                    cls = ann.get("class_id", 1 if row["final_decision"] == "fail" else 0)
                    cx, cy, w, h = ann.get("bbox_norm", [0.5, 0.5, 0.1, 0.1])
                    lines.append(f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
                lbl_path.write_text("\n".join(lines))

                exported += 1
            except Exception as e:
                pass  # log and continue

        # Mark as exported
        await db.execute(text("""
            UPDATE dataset_contributions
            SET exported_at = NOW(), dataset_version = :version
            WHERE factory_id = :tenant_id AND exported_at IS NULL
        """), {"version": version, "tenant_id": tenant_id})

        return {"exported": exported, "version": version, "output": str(self.output_dir)}
