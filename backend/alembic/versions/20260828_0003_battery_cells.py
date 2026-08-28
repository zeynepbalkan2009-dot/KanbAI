"""add incoming battery cell traceability

Revision ID: 20260828_0003
Revises: 20260828_0002
Create Date: 2026-08-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260828_0003"
down_revision = "20260828_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    unit_columns = {column["name"] for column in inspector.get_columns("battery_units")}
    if "expected_cell_count" not in unit_columns:
        op.add_column("battery_units", sa.Column("expected_cell_count", sa.Integer(), nullable=False, server_default="1"))
    if inspector.has_table("battery_cell_components"):
        return
    op.create_table(
        "battery_cell_components",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("factory_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("factories.id"), nullable=False),
        sa.Column("battery_unit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("battery_units.id"), nullable=False),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inspection_results.id")),
        sa.Column("cell_identifier", sa.String(255), nullable=False),
        sa.Column("position_code", sa.String(80), nullable=False),
        sa.Column("declared_cell_type", sa.String(20), nullable=False),
        sa.Column("detected_cell_type", sa.String(20)),
        sa.Column("model_confidence", sa.Float()),
        sa.Column("verification_status", sa.String(30), nullable=False, server_default="awaiting_human"),
        sa.Column("human_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("mismatch_reason", sa.Text()),
        sa.Column("registered_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("verified_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("verified_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("factory_id", "cell_identifier", name="uq_battery_cell_factory_identifier"),
        sa.UniqueConstraint("battery_unit_id", "position_code", name="uq_battery_cell_unit_position"),
    )
    op.create_index("ix_battery_cells_unit_status", "battery_cell_components", ["battery_unit_id", "verification_status"])


def downgrade() -> None:
    op.drop_table("battery_cell_components")
    op.drop_column("battery_units", "expected_cell_count")
