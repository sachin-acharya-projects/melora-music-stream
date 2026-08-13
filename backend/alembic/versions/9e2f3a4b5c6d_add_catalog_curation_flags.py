"""add catalog curation flags

Adds is_featured / is_published to artists and songs so admins can curate
what regular users see (publish/hide, feature on home/discover).

Revision ID: 9e2f3a4b5c6d
Revises: 7d9f1a2b3c4e
Create Date: 2026-08-12 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9e2f3a4b5c6d"
down_revision: Union[str, None] = "7d9f1a2b3c4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("artists", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("is_featured", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("is_published", sa.Boolean(), server_default="1", nullable=False)
        )

    with op.batch_alter_table("songs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("is_featured", sa.Boolean(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("is_published", sa.Boolean(), server_default="1", nullable=False)
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("songs", schema=None) as batch_op:
        batch_op.drop_column("is_published")
        batch_op.drop_column("is_featured")

    with op.batch_alter_table("artists", schema=None) as batch_op:
        batch_op.drop_column("is_published")
        batch_op.drop_column("is_featured")
