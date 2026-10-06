"""Secure model registration and production deployment gate.

Production models are intentionally immutable at runtime. Candidate models move
through explicit validation and health checks; failed deployments restore the
previous active deployment.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Awaitable, Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.model_security import (
    artifact_sha256,
    canonical_model_manifest,
    require_signed_model,
    validate_model_metrics,
)
from app.infrastructure.database.models import AIModel, AuditLog, ModelDeployment


HealthCheck = Callable[[AIModel], Awaitable[bool]]


class SecureModelDeploymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    def _signing_secret(self) -> bytes:
        return self.settings.model_signing_secret.encode("utf-8")

    async def register_candidate(
        self,
        *,
        factory_id: uuid.UUID,
        name: str,
        version: str,
        artifact: bytes,
        architecture: str = "onnx",
        model_path: str | None = None,
        onnx_path: str | None = None,
        accuracy_map50: float | None = None,
        precision: float | None = None,
        recall: float | None = None,
        training_dataset_version: str | None = None,
        mlflow_run_id: str | None = None,
        class_labels: dict | None = None,
        notes: str | None = None,
        actor_id: uuid.UUID | None = None,
    ) -> AIModel:
        """Register a factory-private model candidate after hashing and signing."""
        digest = artifact_sha256(artifact)
        manifest = canonical_model_manifest(
            factory_id=str(factory_id),
            model_name=name,
            version=version,
            artifact_sha256=digest,
        )

        if self.settings.edge_require_signed_model and not self.settings.model_signing_secret:
            raise ValueError("Model signing secret is not configured")

        from app.core.model_security import sign_model_manifest

        signature = sign_model_manifest(manifest, self._signing_secret()) if self.settings.model_signing_secret else None
        require_signed_model(
            manifest,
            signature,
            self.settings.model_signing_secret,
            required=self.settings.edge_require_signed_model,
        )

        existing = await self.db.execute(
            select(AIModel).where(
                AIModel.factory_id == factory_id,
                AIModel.name == name,
                AIModel.version == version,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Model name/version already exists for this factory")

        model = AIModel(
            id=uuid.uuid4(),
            factory_id=factory_id,
            name=name,
            version=version,
            architecture=architecture,
            model_path=model_path,
            onnx_path=onnx_path,
            accuracy_map50=accuracy_map50,
            precision=precision,
            recall=recall,
            training_dataset_version=training_dataset_version,
            mlflow_run_id=mlflow_run_id,
            class_labels=class_labels,
            notes=notes,
            artifact_sha256=digest,
            artifact_signature=signature,
            signature_algorithm="HMAC-SHA256" if signature else None,
        )
        self.db.add(model)
        await self.db.flush()
        await self._audit(
            factory_id=factory_id,
            actor_id=actor_id,
            action="model_registered",
            resource_id=str(model.id),
            new_value={"name": name, "version": version, "artifact_sha256": digest},
        )
        return model

    async def deploy(
        self,
        *,
        factory_id: uuid.UUID,
        model_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        health_check: HealthCheck,
        reason: str = "approved deployment",
    ) -> ModelDeployment:
        """Run the complete production gate and automatically restore the prior model on failure."""
        result = await self.db.execute(
            select(AIModel).where(
                AIModel.id == model_id,
                AIModel.factory_id == factory_id,
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError("Model is not authorized for this factory")

        if model.factory_id != factory_id:
            raise ValueError("Cross-factory model deployment is forbidden")

        manifest = canonical_model_manifest(
            factory_id=str(factory_id),
            model_name=model.name,
            version=model.version,
            artifact_sha256=model.artifact_sha256 or "",
        )
        require_signed_model(
            manifest,
            model.artifact_signature,
            self.settings.model_signing_secret,
            required=self.settings.edge_require_signed_model,
        )
        validate_model_metrics(
            map50=model.accuracy_map50,
            precision=model.precision,
            recall=model.recall,
            min_map50=self.settings.model_validation_min_map50,
            min_precision=self.settings.model_validation_min_precision,
            min_recall=self.settings.model_validation_min_recall,
        )

        active_result = await self.db.execute(
            select(ModelDeployment)
            .where(
                ModelDeployment.factory_id == factory_id,
                ModelDeployment.is_active.is_(True),
            )
            .order_by(ModelDeployment.deployed_at.desc())
            .with_for_update()
        )
        previous = active_result.scalars().first()

        if previous and previous.model_id == model.id:
            return previous

        if previous:
            previous.is_active = False
            previous.deployment_status = "retired"
            previous.retired_at = datetime.now(timezone.utc)

        deployment = ModelDeployment(
            id=uuid.uuid4(),
            factory_id=factory_id,
            model_id=model.id,
            deployed_by=actor_id,
            is_active=True,
            deployment_status="deploying",
            artifact_sha256=model.artifact_sha256,
            deployment_reason=reason,
            deployed_at=datetime.now(timezone.utc),
        )
        self.db.add(deployment)
        model.is_production = True
        model.approved_at = datetime.now(timezone.utc)
        await self.db.flush()

        healthy = False
        try:
            healthy = await health_check(model)
        except Exception:
            healthy = False

        if not healthy:
            deployment.is_active = False
            deployment.deployment_status = "rolled_back"
            deployment.retired_at = datetime.now(timezone.utc)
            model.is_production = False
            model.retired_at = datetime.now(timezone.utc)

            if previous:
                previous.is_active = True
                previous.deployment_status = "active"
                previous.retired_at = None
                restored = await self.db.get(AIModel, previous.model_id)
                if restored:
                    restored.is_production = True
                    restored.retired_at = None

            await self.db.flush()
            await self._audit(
                factory_id=factory_id,
                actor_id=actor_id,
                action="model_deployment_rolled_back",
                resource_id=str(deployment.id),
                old_value={"model_id": str(model.id)},
                new_value={"restored_model_id": str(previous.model_id) if previous else None},
            )
            # The request dependency rolls back on exceptions. Commit the explicit
            # restoration before raising so the safety rollback and audit trail
            # cannot be erased by the HTTP 503 path.
            await self.db.commit()
            raise RuntimeError("Model health check failed; previous production model restored")

        deployment.deployment_status = "active"
        await self.db.flush()
        await self._audit(
            factory_id=factory_id,
            actor_id=actor_id,
            action="model_deployed",
            resource_id=str(deployment.id),
            new_value={"model_id": str(model.id), "artifact_sha256": model.artifact_sha256},
        )
        return deployment

    async def _audit(
        self,
        *,
        factory_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        action: str,
        resource_id: str,
        old_value: dict | None = None,
        new_value: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                id=uuid.uuid4(),
                factory_id=factory_id,
                actor_id=actor_id,
                action=action,
                resource_type="model_deployment",
                resource_id=resource_id,
                old_value=old_value,
                new_value=new_value,
            )
        )
        await self.db.flush()
