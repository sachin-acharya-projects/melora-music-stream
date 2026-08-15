"""add network_context to bug reports

Stores host-supplied diagnostics (e.g. failed network requests with their
request payloads and responses) attached to each bug report.

Revision ID: d4e5f6a7b8c9
Revises: c3f2a9b1d4e5
Create Date: 2026-08-15 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3f2a9b1d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("bug_reports", schema=None) as batch_op:
        batch_op.add_column(sa.Column("network_context", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("bug_reports", schema=None) as batch_op:
        batch_op.drop_column("network_context")
