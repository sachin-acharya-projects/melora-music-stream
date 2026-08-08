"""add artist channel metadata

Revision ID: 3f7a9b2c4d5e
Revises: fa441c289bc6
Create Date: 2026-08-07 09:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3f7a9b2c4d5e"
down_revision: Union[str, None] = "a43add9ed4ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("artists", schema=None) as batch_op:
        batch_op.add_column(sa.Column("channel_metadata", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("artists", schema=None) as batch_op:
        batch_op.drop_column("channel_metadata")
