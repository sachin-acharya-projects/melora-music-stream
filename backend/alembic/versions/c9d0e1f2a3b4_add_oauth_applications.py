"""add user-registered OAuth applications

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-11-04

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "oauth_applications",
        sa.Column("owner_user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("client_id", sa.String(length=80), nullable=False),
        sa.Column("client_secret_hash", sa.String(length=64), nullable=True),
        sa.Column("redirect_uris", sa.JSON(), nullable=False),
        sa.Column("allowed_scopes", sa.JSON(), nullable=False),
        sa.Column("is_confidential", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id"),
    )
    op.create_index("ix_oauth_applications_id", "oauth_applications", ["id"])
    op.create_index("ix_oauth_applications_owner_user_id", "oauth_applications", ["owner_user_id"])
    op.create_index("ix_oauth_applications_client_id", "oauth_applications", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_oauth_applications_client_id", table_name="oauth_applications")
    op.drop_index("ix_oauth_applications_owner_user_id", table_name="oauth_applications")
    op.drop_index("ix_oauth_applications_id", table_name="oauth_applications")
    op.drop_table("oauth_applications")
