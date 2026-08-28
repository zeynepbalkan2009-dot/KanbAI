"""add battery traceability workflow

Revision ID: 20260828_0002
Revises: 20260727_0001
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260828_0002"
down_revision = "20260727_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The historical initial migration uses current metadata.create_all(). On a
    # brand-new database that may already include these additive tables, so keep
    # this revision safe for both upgraded and fresh installations.
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("battery_units") and inspector.has_table("battery_step_evidence"):
        return
    op.create_table(
        "battery_units",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("factory_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("factories.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("production_line_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("production_lines.id")),
        sa.Column("serial_number", sa.String(120), nullable=False),
        sa.Column("barcode", sa.String(255)),
        sa.Column("cell_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="in_progress"),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("factory_id", "serial_number", name="uq_battery_unit_factory_serial"),
        sa.UniqueConstraint("factory_id", "barcode", name="uq_battery_unit_factory_barcode"),
    )
    op.create_index("ix_battery_units_factory_status", "battery_units", ["factory_id", "status"])

    op.create_table(
        "battery_step_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("factory_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("factories.id"), nullable=False),
        sa.Column("battery_unit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("battery_units.id"), nullable=False),
        sa.Column("station_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stations.id")),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inspection_results.id")),
        sa.Column("step_id", sa.Integer(), nullable=False),
        sa.Column("step_name", sa.String(120), nullable=False),
        sa.Column("expected_label", sa.String(100), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(20), nullable=False, server_default="awaiting_review"),
        sa.Column("human_decision", sa.String(20)),
        sa.Column("observed_label", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("test_results", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("captured_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("battery_unit_id", "step_id", "attempt_no", name="uq_battery_step_attempt"),
    )
    op.create_index("ix_battery_evidence_unit_step", "battery_step_evidence", ["battery_unit_id", "step_id"])
    op.create_index("ix_battery_evidence_factory_status", "battery_step_evidence", ["factory_id", "status"])


def downgrade() -> None:
    op.drop_table("battery_step_evidence")
    op.drop_table("battery_units")
