"""move_avatars_under_media

Revision ID: eb3e15bcc3d0
Revises: ac90e01ee83f
Create Date: 2026-08-06

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "eb3e15bcc3d0"
down_revision: str | None = "ac90e01ee83f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        text(
            "UPDATE users "
            "SET avatar_url = replace(avatar_url, '/avatars/', '/media/avatars/') "
            "WHERE avatar_url LIKE '/avatars/%'"
        )
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        text(
            "UPDATE users "
            "SET avatar_url = replace(avatar_url, '/media/avatars/', '/avatars/') "
            "WHERE avatar_url LIKE '/media/avatars/%'"
        )
    )
