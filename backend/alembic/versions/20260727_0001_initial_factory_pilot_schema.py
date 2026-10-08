"""initial factory pilot schema

Revision ID: 20260727_0001
Revises:
Create Date: 2026-07-27
"""

from alembic import op

from app.infrastructure.database.legacy_initial_models import BaselineBase


revision = "20260727_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    BaselineBase.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    BaselineBase.metadata.drop_all(bind=bind)
