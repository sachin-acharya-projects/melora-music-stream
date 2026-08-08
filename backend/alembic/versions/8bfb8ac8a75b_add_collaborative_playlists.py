"""add collaborative playlists

Revision ID: 8bfb8ac8a75b
Revises: 8d7548eca170
Create Date: 2026-08-06 21:26:23.195968

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8bfb8ac8a75b"
down_revision: Union[str, None] = "8d7548eca170"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("playlists") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_collaborative",
                sa.Boolean(),
                nullable=True,
                server_default=sa.false(),
            )
        )

    op.execute(
        "UPDATE playlists SET is_collaborative = 0 WHERE is_collaborative IS NULL"
    )

    op.create_table(
        "playlist_collaborators",
        sa.Column("playlist_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("playlist_id", "user_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("playlist_collaborators")

    with op.batch_alter_table("playlists") as batch_op:
        batch_op.drop_column("is_collaborative")
