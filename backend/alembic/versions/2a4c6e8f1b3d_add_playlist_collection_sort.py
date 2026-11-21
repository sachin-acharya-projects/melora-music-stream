"""add per-user playlist collection sort preference

Revision ID: 2a4c6e8f1b3d
Revises: f1a2b3c4d5e6
Create Date: 2026-11-21
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "2a4c6e8f1b3d"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "playlist_collection_sort",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("""'{"sort_by":"created_at","order":"desc"}'"""),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "playlist_collection_sort")
