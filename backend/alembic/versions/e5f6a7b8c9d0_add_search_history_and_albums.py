"""add search history and album favorites

Adds a per-user search history table plus album + album_favorites tables so
users can save albums to a personal library.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-26 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "search_histories",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("query", sa.String(), nullable=False),
        sa.Column("searched_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_search_histories_user_id", "search_histories", ["user_id"], unique=False
    )
    op.create_index(
        "ix_search_histories_query", "search_histories", ["query"], unique=False
    )
    op.create_unique_constraint(
        "uq_search_history_user_query", "search_histories", ["user_id", "query"]
    )

    op.create_table(
        "albums",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("browse_id", sa.String(), nullable=False),
        sa.Column("audio_playlist_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("artist_name", sa.String(), nullable=True),
        sa.Column("artist_id", sa.String(), nullable=True),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["artist_id"], ["artists.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_albums_browse_id", "albums", ["browse_id"], unique=False)
    op.create_unique_constraint("uq_albums_browse_id", "albums", ["browse_id"])

    op.create_table(
        "album_favorites",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("album_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["album_id"], ["albums.id"]),
        sa.PrimaryKeyConstraint("user_id", "album_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("album_favorites")
    op.drop_table("albums")
    op.drop_table("search_histories")
