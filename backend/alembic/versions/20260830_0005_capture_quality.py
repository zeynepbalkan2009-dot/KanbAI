"""Add measured capture-quality metadata to inspections.

Revision ID: 20260830_0005
Revises: 20260829_0004
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260830_0005"
down_revision = "20260829_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "inspection_results",
        sa.Column("capture_quality", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inspection_results", "capture_quality")
