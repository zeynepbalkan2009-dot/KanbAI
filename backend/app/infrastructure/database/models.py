"""Database models for the KanbAI factory pilot."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.session import Base


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
    production_lines: Mapped[list["ProductionLine"]] = relationship("ProductionLine", back_populates="factory")

    __table_args__ = (Index("ix_factories_slug", "slug"), Index("ix_factories_active", "is_active"))


class ProductionLine(Base):
    __tablename__ = "production_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory", back_populates="production_lines")
    stations: Mapped[list["Station"]] = relationship("Station", back_populates="production_line")

    __table_args__ = (UniqueConstraint("factory_id", "code", name="uq_line_factory_code"), Index("ix_lines_factory_status", "factory_id", "status"))


class Station(Base):
    __tablename__ = "stations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    production_line_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_lines.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    station_type: Mapped[str] = mapped_column(String(64), default="visual_inspection", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    production_line: Mapped[Optional["ProductionLine"]] = relationship("ProductionLine", back_populates="stations")

    __table_args__ = (UniqueConstraint("factory_id", "code", name="uq_station_factory_code"), Index("ix_stations_factory_line", "factory_id", "production_line_id"))


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    revision: Mapped[Optional[str]] = mapped_column(String(50))
    defect_policy: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("factory_id", "sku", name="uq_product_factory_sku"), Index("ix_products_factory_active", "factory_id", "is_active"))


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    starts_at: Mapped[str] = mapped_column(String(5), nullable=False)
    ends_at: Mapped[str] = mapped_column(String(5), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("factory_id", "name", name="uq_shift_factory_name"), Index("ix_shifts_factory_active", "factory_id", "is_active"))


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="operator")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory", back_populates="users")

    __table_args__ = (UniqueConstraint("factory_id", "email", name="uq_user_factory_email"), Index("ix_users_factory_id", "factory_id"), Index("ix_users_email", "email"))


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    device_uuid: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_label: Mapped[Optional[str]] = mapped_column(String(255))
    station_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("stations.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    firmware_version: Mapped[Optional[str]] = mapped_column(String(50))
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    device_credential_hash: Mapped[Optional[str]] = mapped_column(String(128), unique=True)
    credential_issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    credential_revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    certificate_fingerprint: Mapped[Optional[str]] = mapped_column(String(128))
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory", back_populates="devices")
    station: Mapped[Optional["Station"]] = relationship("Station")
    inspections: Mapped[list["InspectionResult"]] = relationship("InspectionResult", back_populates="device")

    __table_args__ = (Index("ix_devices_factory_id", "factory_id"), Index("ix_devices_uuid", "device_uuid"), Index("ix_devices_factory_active", "factory_id", "is_active"), Index("ix_devices_station", "factory_id", "station_id"))


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
    notes: Mapped[Optional[str]] = mapped_column(Text)

    deployments: Mapped[list["ModelDeployment"]] = relationship(
        "ModelDeployment",
        foreign_keys="ModelDeployment.model_id",
        back_populates="model",
    )
    inspections: Mapped[list["InspectionResult"]] = relationship("InspectionResult", back_populates="model")

    __table_args__ = (UniqueConstraint("name", "version", name="uq_model_name_version"), UniqueConstraint("factory_id", "name", "version", name="uq_aimodels_factory_name_version"), Index("ix_aimodels_production", "is_production"), Index("ix_aimodels_factory_version", "factory_id", "name", "version"))


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

    __table_args__ = (Index("ix_deployments_factory_active", "factory_id", "is_active"), Index("ix_model_deployments_factory_status", "factory_id", "deployment_status"))


class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    model_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_models.id"))
    production_line_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_lines.id"))
    station_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("stations.id"))
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    shift_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("shifts.id"))
    serial_number: Mapped[Optional[str]] = mapped_column(String(120))
    lot_number: Mapped[Optional[str]] = mapped_column(String(120))
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(120))
    captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    capture_quality: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    image_key: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_key: Mapped[Optional[str]] = mapped_column(String(500))
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    defects: Mapped[Optional[list]] = mapped_column(JSONB)
    operator_decision: Mapped[Optional[str]] = mapped_column(String(20))
    operator_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    operator_notes: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    inference_latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(64))
    inference_status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
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
        Index("ix_inspections_product_created", "product_id", "created_at"),
        UniqueConstraint("factory_id", "idempotency_key", name="uq_inspection_factory_idempotency"),
    )


class InspectionDefect(Base):
    __tablename__ = "inspection_defects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_results.id"), nullable=False)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    class_name: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    bbox: Mapped[Optional[dict]] = mapped_column(JSONB)
    corrected_class_name: Mapped[Optional[str]] = mapped_column(String(100))
    correction_source: Mapped[Optional[str]] = mapped_column(String(50))

    __table_args__ = (Index("ix_defects_factory_class", "factory_id", "class_name"), Index("ix_defects_inspection", "inspection_id"))


class HITLReview(Base):
    __tablename__ = "hitl_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_results.id"), nullable=False)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    corrected_label: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("inspection_id", name="uq_hitl_review_inspection"), Index("ix_hitl_factory_reviewed", "factory_id", "reviewed_at"))


class DatasetContribution(Base):
    __tablename__ = "dataset_contributions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_results.id"), nullable=False)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="hitl", nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    split: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)

    __table_args__ = (UniqueConstraint("inspection_id", name="uq_dataset_contribution_inspection"), Index("ix_dataset_factory_split", "factory_id", "split"))


class DeviceActivationToken(Base):
    __tablename__ = "device_activation_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    station_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("stations.id"))
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    label: Mapped[Optional[str]] = mapped_column(String(255))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    used_by_device_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_activation_factory_expires", "factory_id", "expires_at"),)


class EdgeSyncEvent(Base):
    """Durable, idempotent ingress record for events sent by factory Edge agents."""

    __tablename__ = "edge_sync_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    payload_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="received", nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    available_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    factory: Mapped["Factory"] = relationship("Factory")
    device: Mapped["Device"] = relationship("Device")

    __table_args__ = (
        UniqueConstraint("factory_id", "event_id", name="uq_edge_sync_factory_event"),
        Index("ix_edge_sync_device_created", "device_id", "created_at"),
        Index("ix_edge_sync_status_available", "status", "available_at"),
    )


class BatteryUnit(Base):
    """One traceable battery product moving through the six-stage pilot workflow."""

    __tablename__ = "battery_units"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    production_line_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_lines.id"))
    serial_number: Mapped[str] = mapped_column(String(120), nullable=False)
    barcode: Mapped[Optional[str]] = mapped_column(String(255))
    cell_type: Mapped[str] = mapped_column(String(20), nullable=False)
    expected_cell_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="in_progress", nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default=dict)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("factory_id", "serial_number", name="uq_battery_unit_factory_serial"),
        UniqueConstraint("factory_id", "barcode", name="uq_battery_unit_factory_barcode"),
        Index("ix_battery_units_factory_status", "factory_id", "status"),
    )


class BatteryStepEvidence(Base):
    """Human-reviewed evidence for one battery workflow stage and attempt."""

    __tablename__ = "battery_step_evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    battery_unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("battery_units.id"), nullable=False)
    station_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("stations.id"))
    inspection_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_results.id"))
    step_id: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(120), nullable=False)
    expected_label: Mapped[str] = mapped_column(String(100), nullable=False)
    attempt_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="awaiting_review", nullable=False)
    human_decision: Mapped[Optional[str]] = mapped_column(String(20))
    observed_label: Mapped[Optional[str]] = mapped_column(String(100))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    criteria_results: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    test_results: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    captured_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("battery_unit_id", "step_id", "attempt_no", name="uq_battery_step_attempt"),
        Index("ix_battery_evidence_unit_step", "battery_unit_id", "step_id"),
        Index("ix_battery_evidence_factory_status", "factory_id", "status"),
    )


class BatteryCellComponent(Base):
    """Traceable incoming cell assigned to a physical position in a battery unit."""

    __tablename__ = "battery_cell_components"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    battery_unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("battery_units.id"), nullable=False)
    inspection_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_results.id"))
    cell_identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    position_code: Mapped[str] = mapped_column(String(80), nullable=False)
    declared_cell_type: Mapped[str] = mapped_column(String(20), nullable=False)
    detected_cell_type: Mapped[Optional[str]] = mapped_column(String(20))
    model_confidence: Mapped[Optional[float]] = mapped_column(Float)
    verification_status: Mapped[str] = mapped_column(String(30), default="awaiting_human", nullable=False)
    human_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mismatch_reason: Mapped[Optional[str]] = mapped_column(Text)
    registered_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("factory_id", "cell_identifier", name="uq_battery_cell_factory_identifier"),
        UniqueConstraint("battery_unit_id", "position_code", name="uq_battery_cell_unit_position"),
        Index("ix_battery_cells_unit_status", "battery_unit_id", "verification_status"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"))
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), nullable=False)
    old_value: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_value: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    __table_args__ = (Index("ix_auditlog_factory_created", "factory_id", "created_at"), Index("ix_auditlog_actor", "actor_id"), Index("ix_auditlog_action", "action"))
