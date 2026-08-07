"""add playlist visibility and follows

Revision ID: 8d7548eca170
Revises: eb3e15bcc3d0
Create Date: 2026-08-06 21:09:56.425395

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8d7548eca170"
down_revision: Union[str, None] = "eb3e15bcc3d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("playlists") as batch_op:
        batch_op.add_column(sa.Column("visibility", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("cover_image_url", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("follower_count", sa.Integer(), nullable=True))

    op.execute("UPDATE playlists SET visibility = 'private' WHERE visibility IS NULL")
    op.execute("UPDATE playlists SET follower_count = 0 WHERE follower_count IS NULL")

    op.create_table(
        "playlist_follows",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("playlist_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"]),
        sa.PrimaryKeyConstraint("user_id", "playlist_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("playlist_follows")

    with op.batch_alter_table("playlists") as batch_op:
        batch_op.drop_column("visibility")
        batch_op.drop_column("description")
        batch_op.drop_column("cover_image_url")
        batch_op.drop_column("follower_count")
