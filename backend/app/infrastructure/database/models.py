"""
Domain models — all tables include tenant_id for isolation.
Soft-delete via deleted_at on mutable entities.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey,
    Index, Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.session import Base


# ── Factory (= Tenant) ────────────────────────────────────────────────────────

class Factory(Base):
    __tablename__ = "factories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    location: Mapped[Optional[str]] = mapped_column(String(500))
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    users: Mapped[list["User"]] = relationship("User", back_populates="factory")
    devices: Mapped[list["Device"]] = relationship("Device", back_populates="factory")

    __table_args__ = (
        Index("ix_factories_slug", "slug"),
        Index("ix_factories_active", "is_active"),
    )


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="operator")
    # roles: admin | manager | operator | viewer | mlops
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory", back_populates="users")

    __table_args__ = (
        UniqueConstraint("factory_id", "email", name="uq_user_factory_email"),
        Index("ix_users_factory_id", "factory_id"),
        Index("ix_users_email", "email"),
    )


# ── Device ────────────────────────────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    device_uuid: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_label: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    firmware_version: Mapped[Optional[str]] = mapped_column(String(50))
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory", back_populates="devices")
    inspections: Mapped[list["InspectionResult"]] = relationship("InspectionResult", back_populates="device")

    __table_args__ = (
        Index("ix_devices_factory_id", "factory_id"),
        Index("ix_devices_uuid", "device_uuid"),
        Index("ix_devices_factory_active", "factory_id", "is_active"),
    )


# ── AI Model Registry ─────────────────────────────────────────────────────────

class AIModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    architecture: Mapped[str] = mapped_column(String(100), default="yolov8")
    model_path: Mapped[Optional[str]] = mapped_column(String(500))
    onnx_path: Mapped[Optional[str]] = mapped_column(String(500))
    accuracy_map50: Mapped[Optional[float]] = mapped_column(Float)
    precision: Mapped[Optional[float]] = mapped_column(Float)
    recall: Mapped[Optional[float]] = mapped_column(Float)
    training_dataset_version: Mapped[Optional[str]] = mapped_column(String(100))
    mlflow_run_id: Mapped[Optional[str]] = mapped_column(String(64))
    is_production: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    class_labels: Mapped[Optional[dict]] = mapped_column(JSONB)
    # e.g. {"0": "scratch", "1": "dent", "2": "crack"}
    notes: Mapped[Optional[str]] = mapped_column(Text)

    deployments: Mapped[list["ModelDeployment"]] = relationship("ModelDeployment", back_populates="model")
    inspections: Mapped[list["InspectionResult"]] = relationship("InspectionResult", back_populates="model")

    __table_args__ = (
        UniqueConstraint("name", "version", name="uq_model_name_version"),
        Index("ix_aimodels_production", "is_production"),
    )


# ── Model Deployment (which model runs on which factory) ─────────────────────

class ModelDeployment(Base):
    __tablename__ = "model_deployments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_models.id"), nullable=False)
    deployed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rollback_model_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_models.id"))
    retired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory")
    model: Mapped["AIModel"] = relationship("AIModel", foreign_keys=[model_id], back_populates="deployments")

    __table_args__ = (
        Index("ix_deployments_factory_active", "factory_id", "is_active"),
    )


# ── Inspection Result ─────────────────────────────────────────────────────────

class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    model_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_models.id"))

    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    image_key: Mapped[str] = mapped_column(String(500), nullable=False)  # MinIO key

    # AI result
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    # pass | fail | review | pending | error
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    defects: Mapped[Optional[list]] = mapped_column(JSONB)
    # [{class_name, bbox:[x1,y1,x2,y2], confidence}]

    # Operator override
    operator_decision: Mapped[Optional[str]] = mapped_column(String(20))
    operator_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    operator_notes: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Telemetry
    inference_latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(64))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory")
    device: Mapped["Device"] = relationship("Device", back_populates="inspections")
    model: Mapped[Optional["AIModel"]] = relationship("AIModel", back_populates="inspections")

    __table_args__ = (
        Index("ix_inspections_factory_created", "factory_id", "created_at"),
        Index("ix_inspections_device_created", "device_id", "created_at"),
        Index("ix_inspections_decision", "factory_id", "decision"),
        Index("ix_inspections_task_id", "celery_task_id"),
    )


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"))
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    # e.g. "user.login", "device.activated", "model.deployed", "inspection.reviewed"
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), nullable=False)
    old_value: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_value: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    __table_args__ = (
        Index("ix_auditlog_factory_created", "factory_id", "created_at"),
        Index("ix_auditlog_actor", "actor_id"),
        Index("ix_auditlog_action", "action"),
    )
