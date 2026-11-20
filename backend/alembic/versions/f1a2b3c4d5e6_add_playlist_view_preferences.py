"""add per-user playlist view preferences

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0, 6c1d3e4f5a6b
Create Date: 2026-11-20
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = (
    "e5f6a7b8c9d0",
    "6c1d3e4f5a6b",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "playlist_preferences",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("playlist_id", sa.String(), nullable=False),
        sa.Column("sort_by", sa.String(), nullable=False, server_default="position"),
        sa.Column("sort_order", sa.String(), nullable=False, server_default="asc"),
        sa.Column("is_paginated", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("view_mode", sa.String(), nullable=False, server_default="grid"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "playlist_id"),
    )
    op.create_index(
        op.f("ix_playlist_preferences_id"),
        "playlist_preferences",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_playlist_preferences_id"), table_name="playlist_preferences")
    op.drop_table("playlist_preferences")
