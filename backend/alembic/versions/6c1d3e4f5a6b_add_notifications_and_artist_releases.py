"""add notifications and artist releases

Revision ID: 6c1d3e4f5a6b
Revises: 5b8a1c2d9e4f
Create Date: 2026-08-09 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6c1d3e4f5a6b"
down_revision: Union[str, None] = "5b8a1c2d9e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "notifications",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=True),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_notifications_channel"), ["channel"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_id"), ["id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_type"), ["type"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_notifications_user_created"), ["user_id", "created_at"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_notifications_user_id"), ["user_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_notifications_user_read"), ["user_id", "is_read"], unique=False
        )

    op.create_table(
        "releases",
        sa.Column("artist_id", sa.String(), nullable=False),
        sa.Column("release_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("cover_image_url", sa.String(), nullable=True),
        sa.Column("release_date", sa.DateTime(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("browse_id", sa.String(), nullable=True),
        sa.Column("audio_playlist_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["artist_id"], ["artists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("artist_id", "browse_id", name="uq_release_artist_browse"),
    )
    with op.batch_alter_table("releases", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_releases_artist_id"), ["artist_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_releases_date"), ["release_date"], unique=False)
        batch_op.create_index(batch_op.f("ix_releases_id"), ["id"], unique=False)

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("notification_settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("notification_settings")

    with op.batch_alter_table("releases", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_releases_id"))
        batch_op.drop_index(batch_op.f("ix_releases_date"))
        batch_op.drop_index(batch_op.f("ix_releases_artist_id"))
    op.drop_table("releases")

    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_notifications_user_read"))
        batch_op.drop_index(batch_op.f("ix_notifications_user_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_user_created"))
        batch_op.drop_index(batch_op.f("ix_notifications_type"))
        batch_op.drop_index(batch_op.f("ix_notifications_id"))
        batch_op.drop_index(batch_op.f("ix_notifications_channel"))
    op.drop_table("notifications")
