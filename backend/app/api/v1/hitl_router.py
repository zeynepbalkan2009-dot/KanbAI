import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationError
from app.domains.auth.service import CurrentUser, get_current_user, require_role
from app.infrastructure.database.models import DatasetContribution, HITLReview, InspectionResult, Product
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/hitl", tags=["human-in-the-loop"])
settings = get_settings()


class HITLDecisionIn(BaseModel):
    decision: str
    corrected_label: Optional[str] = None
    notes: Optional[str] = None
    dataset_contribution: bool = True


def review_queue_decisions() -> list[str]:
    if settings.pilot_mode:
        return ["pass", "review", "fail", "out_of_scope"]
    return ["review", "fail"]


def product_context(product: Optional[Product]) -> dict:
    policy = dict(product.defect_policy or {}) if product else {}
    defect_classes = [str(item).strip() for item in policy.get("defect_classes", []) if str(item).strip()]
    return {
        "product_id": str(product.id) if product else None,
        "sku": product.sku if product else None,
        "product_name": product.name if product else None,
        "revision": product.revision if product else None,
        "industry_domain": policy.get("industry_domain"),
        "operation_stage": policy.get("operation_stage"),
        "defect_classes": defect_classes,
        "allowed_labels": ["good", *defect_classes, "unclassified_defect", "out_of_scope"],
    }


@router.get("/queue")
async def hitl_queue(limit: int = Query(50, le=200), current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = (
        select(InspectionResult, Product)
        .outerjoin(Product, Product.id == InspectionResult.product_id)
        .where(
            InspectionResult.factory_id == uuid.UUID(current.tenant_id),
            InspectionResult.deleted_at.is_(None),
            InspectionResult.operator_decision.is_(None),
            InspectionResult.decision.in_(review_queue_decisions()),
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
            "product": product_context(product),
        }
        for i, product in result.all()
    ]


@router.get("/stats")
async def hitl_stats(current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pending = await db.execute(select(func.count()).select_from(InspectionResult).where(InspectionResult.factory_id == uuid.UUID(current.tenant_id), InspectionResult.operator_decision.is_(None), InspectionResult.decision.in_(review_queue_decisions()), InspectionResult.deleted_at.is_(None)))
    reviewed = await db.execute(select(func.count()).select_from(HITLReview).where(HITLReview.factory_id == uuid.UUID(current.tenant_id)))
    dataset = await db.execute(select(func.count()).select_from(DatasetContribution).where(DatasetContribution.factory_id == uuid.UUID(current.tenant_id)))
    return {"pending_reviews": pending.scalar() or 0, "completed_reviews": reviewed.scalar() or 0, "dataset_contributions": dataset.scalar() or 0}


@router.get("/{inspection_id}")
async def hitl_detail(inspection_id: str, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    inspection = await db.get(InspectionResult, uuid.UUID(inspection_id))
    if not inspection or str(inspection.factory_id) != current.tenant_id:
        raise NotFoundError("Inspection")
    product = await db.get(Product, inspection.product_id) if inspection.product_id else None
    return {
        "id": str(inspection.id),
        "decision": inspection.decision,
        "confidence": inspection.confidence,
        "defects": inspection.defects or [],
        "operator_decision": inspection.operator_decision,
        "operator_notes": inspection.operator_notes,
        "image_key": inspection.image_key,
        "created_at": inspection.created_at,
        "product": product_context(product),
    }


@router.post("/{inspection_id}/review")
async def review_hitl(inspection_id: str, body: HITLDecisionIn, current: CurrentUser = Depends(require_role("admin", "manager", "quality_manager", "operator")), db: AsyncSession = Depends(get_db)):
    normalized = body.decision.lower()
    allowed_decisions = {"pass", "fail", "out_of_scope"} if settings.pilot_mode else {"pass", "fail", "wrong_prediction", "needs_retrain", "out_of_scope"}
    if normalized not in allowed_decisions:
        raise ValidationError(f"decision must be one of: {', '.join(sorted(allowed_decisions))}")
    inspection = await db.get(InspectionResult, uuid.UUID(inspection_id))
    if not inspection or str(inspection.factory_id) != current.tenant_id:
        raise NotFoundError("Inspection")

    product = await db.get(Product, inspection.product_id) if inspection.product_id else None
    context = product_context(product)
    allowed_labels = set(context["allowed_labels"])
    if normalized == "pass":
        label = "good"
        if body.corrected_label and body.corrected_label != label:
            raise ValidationError("PASS reviews must use the 'good' dataset label")
    elif normalized == "out_of_scope":
        label = "out_of_scope"
        if body.corrected_label and body.corrected_label != label:
            raise ValidationError("OUT OF SCOPE reviews must use the 'out_of_scope' dataset label")
    else:
        label = (body.corrected_label or "").strip()
        if label not in allowed_labels or label in {"good", "out_of_scope"}:
            raise ValidationError("FAIL reviews require a defect label from the selected product profile, or 'unclassified_defect'")

    final_decision = normalized if normalized in {"pass", "fail", "out_of_scope"} else "fail"
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
        review.corrected_label = label
        review.notes = body.notes
        review.reviewer_id = uuid.UUID(current.user_id)
        review.reviewed_at = now
    else:
        db.add(HITLReview(id=uuid.uuid4(), inspection_id=inspection.id, factory_id=inspection.factory_id, reviewer_id=uuid.UUID(current.user_id), decision=normalized, corrected_label=label, notes=body.notes, reviewed_at=now))

    include_in_dataset = body.dataset_contribution or settings.pilot_mode
    if include_in_dataset:
        metadata = {
            "decision": normalized,
            "product_id": context["product_id"],
            "sku": context["sku"],
            "revision": context["revision"],
            "industry_domain": context["industry_domain"],
            "operation_stage": context["operation_stage"],
            "profile_defect_classes": context["defect_classes"],
        }
        existing_dataset = await db.execute(select(DatasetContribution).where(DatasetContribution.inspection_id == inspection.id))
        contribution = existing_dataset.scalar_one_or_none()
        if contribution:
            contribution.label = label
            contribution.approved_by = uuid.UUID(current.user_id)
            contribution.approved_at = now
            contribution.metadata_json = metadata
        else:
            db.add(DatasetContribution(id=uuid.uuid4(), inspection_id=inspection.id, factory_id=inspection.factory_id, source="hitl", label=label, split="pending", approved_by=uuid.UUID(current.user_id), approved_at=now, metadata_json=metadata))

    await db.flush()
    return {"inspection_id": inspection_id, "review_status": "accepted", "dataset_contribution": include_in_dataset, "final_decision": final_decision}
