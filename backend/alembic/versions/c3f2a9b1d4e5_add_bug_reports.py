"""add bug reports

Adds the bug_reports table backing the user-facing bug reporter widget
(create / list own / admin review + status workflow).

Revision ID: c3f2a9b1d4e5
Revises: 9e2f3a4b5c6d
Create Date: 2026-08-13 14:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3f2a9b1d4e5"
down_revision: Union[str, None] = "9e2f3a4b5c6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "bug_reports",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("screenshot_url", sa.String(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("bug_reports", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_bug_reports_id"), ["id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_bug_reports_status"), ["status"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_bug_reports_user_id"), ["user_id"], unique=False
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("bug_reports", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_bug_reports_user_id"))
        batch_op.drop_index(batch_op.f("ix_bug_reports_status"))
        batch_op.drop_index(batch_op.f("ix_bug_reports_id"))
    op.drop_table("bug_reports")
