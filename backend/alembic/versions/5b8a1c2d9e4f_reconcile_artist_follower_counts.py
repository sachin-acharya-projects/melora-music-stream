"""reconcile artist follower counts

Revision ID: 5b8a1c2d9e4f
Revises: 3f7a9b2c4d5e
Create Date: 2026-08-07 10:30:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5b8a1c2d9e4f"
down_revision: Union[str, None] = "3f7a9b2c4d5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # follower_count must reflect our own system's followers, not the
    # YouTube subscriber count that used to be written at import time.
    op.execute(
        """
        UPDATE artists
        SET follower_count = (
            SELECT COUNT(*)
            FROM user_artist_follows
            WHERE user_artist_follows.artist_id = artists.id
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    # No way to restore the previous subscriber-derived values; no-op.
    pass
