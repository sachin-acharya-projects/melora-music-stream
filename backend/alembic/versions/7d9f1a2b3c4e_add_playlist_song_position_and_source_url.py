"""add playlist song position and source url

Revision ID: 7d9f1a2b3c4e
Revises: 6c1d3e4f5a6b
Create Date: 2026-08-12 12:00:00.000000

"""
from collections import defaultdict

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7d9f1a2b3c4e"
down_revision = "6c1d3e4f5a6b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("playlist_song", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("position", sa.Integer(), server_default="0", nullable=False)
        )

    # Backfill positions using the existing ordering (song created_at, then id)
    # so previously saved playlists keep their current order.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT ps.playlist_id, ps.song_id
            FROM playlist_song ps
            JOIN songs s ON s.id = ps.song_id
            ORDER BY ps.playlist_id, s.created_at, s.id
            """
        )
    ).fetchall()
    positions: dict[str, int] = defaultdict(int)
    for playlist_id, song_id in rows:
        conn.execute(
            sa.text(
                """
                UPDATE playlist_song
                SET position = :position
                WHERE playlist_id = :playlist_id AND song_id = :song_id
                """
            ),
            {"position": positions[playlist_id], "playlist_id": playlist_id, "song_id": song_id},
        )
        positions[playlist_id] += 1

    with op.batch_alter_table("playlists", schema=None) as batch_op:
        batch_op.add_column(sa.Column("source_url", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("playlists", schema=None) as batch_op:
        batch_op.drop_column("source_url")

    with op.batch_alter_table("playlist_song", schema=None) as batch_op:
        batch_op.drop_column("position")
