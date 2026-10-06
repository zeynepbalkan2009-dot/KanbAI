"""Factory-scoped model registry and signed deployment metadata.

Revision ID: 20261006_0007
Revises: 20261006_0006
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261006_0007"
down_revision = "20261006_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_models", sa.Column("factory_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("ai_models", sa.Column("artifact_sha256", sa.String(length=64), nullable=True))
    op.add_column("ai_models", sa.Column("artifact_signature", sa.Text(), nullable=True))
    op.add_column("ai_models", sa.Column("signature_algorithm", sa.String(length=40), nullable=True))
    op.add_column("ai_models", sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("ai_models", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("ai_models", sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_ai_models_factory", "ai_models", "factories", ["factory_id"], ["id"])
    op.create_index("ix_aimodels_factory_version", "ai_models", ["factory_id", "name", "version"])
    op.create_unique_constraint("uq_aimodels_factory_name_version", "ai_models", ["factory_id", "name", "version"])

    op.add_column("model_deployments", sa.Column("deployment_status", sa.String(length=30), server_default="active", nullable=False))
    op.add_column("model_deployments", sa.Column("artifact_sha256", sa.String(length=64), nullable=True))
    op.add_column("model_deployments", sa.Column("deployment_reason", sa.Text(), nullable=True))
    op.add_column("model_deployments", sa.Column("deployed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("model_deployments", sa.Column("rollback_of_deployment_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_model_deployments_rollback", "model_deployments", "model_deployments", ["rollback_of_deployment_id"], ["id"])
    op.create_index("ix_model_deployments_factory_status", "model_deployments", ["factory_id", "deployment_status"])


def downgrade() -> None:
    op.drop_index("ix_model_deployments_factory_status", table_name="model_deployments")
    op.drop_constraint("fk_model_deployments_rollback", "model_deployments", type_="foreignkey")
    op.drop_column("model_deployments", "rollback_of_deployment_id")
    op.drop_column("model_deployments", "deployed_at")
    op.drop_column("model_deployments", "deployment_reason")
    op.drop_column("model_deployments", "artifact_sha256")
    op.drop_column("model_deployments", "deployment_status")
    op.drop_constraint("uq_aimodels_factory_name_version", "ai_models", type_="unique")
    op.drop_index("ix_aimodels_factory_version", table_name="ai_models")
    op.drop_constraint("fk_ai_models_factory", "ai_models", type_="foreignkey")
    op.drop_column("ai_models", "retired_at")
    op.drop_column("ai_models", "approved_at")
    op.drop_column("ai_models", "created_at")
    op.drop_column("ai_models", "signature_algorithm")
    op.drop_column("ai_models", "artifact_signature")
    op.drop_column("ai_models", "artifact_sha256")
    op.drop_column("ai_models", "factory_id")
