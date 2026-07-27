import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.domains.auth.service import CurrentUser, get_current_user, require_role
from app.infrastructure.database.models import DatasetContribution, HITLReview, InspectionResult
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/hitl", tags=["human-in-the-loop"])


class HITLDecisionIn(BaseModel):
    decision: str
    corrected_label: Optional[str] = None
    notes: Optional[str] = None
    dataset_contribution: bool = True


@router.get("/queue")
async def hitl_queue(limit: int = Query(50, le=200), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = (
        select(InspectionResult)
        .where(
            InspectionResult.factory_id == uuid.UUID(current.tenant_id),
            InspectionResult.deleted_at.is_(None),
            InspectionResult.operator_decision.is_(None),
            InspectionResult.decision.in_(["review", "fail"]),
        )
        .order_by(InspectionResult.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    return [
        {
            "id": str(i.id),
            "device_id": str(i.device_id),
            "decision": i.decision,
            "confidence": i.confidence,
            "defects": i.defects or [],
            "image_key": i.image_key,
            "created_at": i.created_at,
        }
        for i in result.scalars().all()
    ]


@router.get("/stats")
async def hitl_stats(current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pending = await db.execute(select(func.count()).select_from(InspectionResult).where(InspectionResult.factory_id == uuid.UUID(current.tenant_id), InspectionResult.operator_decision.is_(None), InspectionResult.decision.in_(["review", "fail"]), InspectionResult.deleted_at.is_(None)))
    reviewed = await db.execute(select(func.count()).select_from(HITLReview).where(HITLReview.factory_id == uuid.UUID(current.tenant_id)))
    dataset = await db.execute(select(func.count()).select_from(DatasetContribution).where(DatasetContribution.factory_id == uuid.UUID(current.tenant_id)))
    return {"pending_reviews": pending.scalar() or 0, "completed_reviews": reviewed.scalar() or 0, "dataset_contributions": dataset.scalar() or 0}


@router.get("/{inspection_id}")
async def hitl_detail(inspection_id: str, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    inspection = await db.get(InspectionResult, uuid.UUID(inspection_id))
    if not inspection or str(inspection.factory_id) != current.tenant_id:
        raise NotFoundError("Inspection")
    return {
        "id": str(inspection.id),
        "decision": inspection.decision,
        "confidence": inspection.confidence,
        "defects": inspection.defects or [],
        "operator_decision": inspection.operator_decision,
        "operator_notes": inspection.operator_notes,
        "image_key": inspection.image_key,
        "created_at": inspection.created_at,
    }


@router.post("/{inspection_id}/review")
async def review_hitl(inspection_id: str, body: HITLDecisionIn, current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager", "operator")), db: AsyncSession = Depends(get_db)):
    normalized = body.decision.lower()
    if normalized not in {"pass", "fail", "wrong_prediction", "needs_retrain"}:
        raise ValidationError("decision must be pass, fail, wrong_prediction, or needs_retrain")
    inspection = await db.get(InspectionResult, uuid.UUID(inspection_id))
    if not inspection or str(inspection.factory_id) != current.tenant_id:
        raise NotFoundError("Inspection")

    final_decision = "fail" if normalized in {"fail", "wrong_prediction", "needs_retrain"} else "pass"
    now = datetime.now(timezone.utc)
    await db.execute(
        update(InspectionResult)
        .where(InspectionResult.id == inspection.id)
        .values(operator_decision=final_decision, operator_id=uuid.UUID(current.user_id), operator_notes=body.notes, reviewed_at=now)
    )

    existing_review = await db.execute(select(HITLReview).where(HITLReview.inspection_id == inspection.id))
    review = existing_review.scalar_one_or_none()
    if review:
        review.decision = normalized
        review.corrected_label = body.corrected_label
        review.notes = body.notes
        review.reviewer_id = uuid.UUID(current.user_id)
        review.reviewed_at = now
    else:
        db.add(HITLReview(id=uuid.uuid4(), inspection_id=inspection.id, factory_id=inspection.factory_id, reviewer_id=uuid.UUID(current.user_id), decision=normalized, corrected_label=body.corrected_label, notes=body.notes, reviewed_at=now))

    if body.dataset_contribution:
        label = body.corrected_label or final_decision
        existing_dataset = await db.execute(select(DatasetContribution).where(DatasetContribution.inspection_id == inspection.id))
        contribution = existing_dataset.scalar_one_or_none()
        if contribution:
            contribution.label = label
            contribution.approved_by = uuid.UUID(current.user_id)
            contribution.approved_at = now
        else:
            db.add(DatasetContribution(id=uuid.uuid4(), inspection_id=inspection.id, factory_id=inspection.factory_id, source="hitl", label=label, split="pending", approved_by=uuid.UUID(current.user_id), approved_at=now, metadata_json={"decision": normalized}))

    await db.flush()
    return {"inspection_id": inspection_id, "review_status": "accepted", "dataset_contribution": body.dataset_contribution, "final_decision": final_decision}
