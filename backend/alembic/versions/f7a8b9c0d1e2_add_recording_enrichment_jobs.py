"""add durable recording enrichment jobs

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-11-27
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recording_enrichment_jobs",
        sa.Column("song_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(), nullable=False),
        sa.Column("locked_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("song_id", name="uq_recording_enrichment_job_song"),
    )
    op.create_index(
        "ix_recording_enrichment_jobs_status_available",
        "recording_enrichment_jobs",
        ["status", "available_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_recording_enrichment_jobs_status_available",
        table_name="recording_enrichment_jobs",
    )
    op.drop_table("recording_enrichment_jobs")
