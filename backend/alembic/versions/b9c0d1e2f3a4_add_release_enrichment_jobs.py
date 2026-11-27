"""add durable release enrichment jobs

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
Create Date: 2026-11-27
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "b9c0d1e2f3a4"
down_revision: Union[str, Sequence[str], None] = "a8b9c0d1e2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "release_enrichment_jobs",
        sa.Column("release_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(), nullable=False),
        sa.Column("locked_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["release_id"], ["releases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("release_id", name="uq_release_enrichment_job_release"),
    )
    op.create_index(
        "ix_release_enrichment_jobs_status_available",
        "release_enrichment_jobs",
        ["status", "available_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_release_enrichment_jobs_status_available",
        table_name="release_enrichment_jobs",
    )
    op.drop_table("release_enrichment_jobs")
