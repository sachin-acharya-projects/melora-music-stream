"""add single-use OIDC login handoffs

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-11-04

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "oidc_login_handoffs",
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_oidc_login_handoffs_id", "oidc_login_handoffs", ["id"])
    op.create_index("ix_oidc_login_handoffs_token_hash", "oidc_login_handoffs", ["token_hash"])
    op.create_index("ix_oidc_login_handoffs_user_id", "oidc_login_handoffs", ["user_id"])
    op.create_index("ix_oidc_login_handoffs_expires_at", "oidc_login_handoffs", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_oidc_login_handoffs_expires_at", table_name="oidc_login_handoffs")
    op.drop_index("ix_oidc_login_handoffs_user_id", table_name="oidc_login_handoffs")
    op.drop_index("ix_oidc_login_handoffs_token_hash", table_name="oidc_login_handoffs")
    op.drop_index("ix_oidc_login_handoffs_id", table_name="oidc_login_handoffs")
    op.drop_table("oidc_login_handoffs")
