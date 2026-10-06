"""Secure Edge identity and durable sync ingress.

Revision ID: 20261006_0006
Revises: 20260830_0005
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261006_0006"
down_revision = "20260830_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("devices", sa.Column("device_credential_hash", sa.String(length=128), nullable=True))
    op.add_column("devices", sa.Column("credential_issued_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("devices", sa.Column("credential_revoked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("devices", sa.Column("certificate_fingerprint", sa.String(length=128), nullable=True))
    op.create_unique_constraint("uq_devices_credential_hash", "devices", ["device_credential_hash"])

    op.create_table(
        "edge_sync_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("factory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("payload_sha256", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="received"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["factory_id"], ["factories.id"]),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("factory_id", "event_id", name="uq_edge_sync_factory_event"),
    )
    op.create_index("ix_edge_sync_device_created", "edge_sync_events", ["device_id", "created_at"])
    op.create_index("ix_edge_sync_status_available", "edge_sync_events", ["status", "available_at"])


def downgrade() -> None:
    op.drop_index("ix_edge_sync_status_available", table_name="edge_sync_events")
    op.drop_index("ix_edge_sync_device_created", table_name="edge_sync_events")
    op.drop_table("edge_sync_events")
    op.drop_constraint("uq_devices_credential_hash", "devices", type_="unique")
    op.drop_column("devices", "certificate_fingerprint")
    op.drop_column("devices", "credential_revoked_at")
    op.drop_column("devices", "credential_issued_at")
    op.drop_column("devices", "device_credential_hash")
