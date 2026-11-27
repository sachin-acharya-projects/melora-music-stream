"""merge artist identity and playlist collection sort heads

Revision ID: b7c9d2e4f6a1
Revises: a8c9d1e2f3b4, 2a4c6e8f1b3d
Create Date: 2026-11-27

This is a graph-only merge. Both parent migrations remain intact and are
applied before this revision; no schema operations are needed here.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b7c9d2e4f6a1"
down_revision: Union[str, Sequence[str], None] = (
    "a8c9d1e2f3b4",
    "2a4c6e8f1b3d",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
