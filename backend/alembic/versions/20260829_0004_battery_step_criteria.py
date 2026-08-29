"""Add human-reviewed battery step criteria.

Revision ID: 20260829_0004
Revises: 20260828_0003
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260829_0004"
down_revision = "20260828_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "battery_step_evidence",
        sa.Column("criteria_results", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("battery_step_evidence", "criteria_results")
