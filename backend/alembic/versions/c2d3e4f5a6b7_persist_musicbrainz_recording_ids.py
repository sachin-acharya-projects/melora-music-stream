"""persist MusicBrainz recording IDs on release tracks

Revision ID: c2d3e4f5a6b7
Revises: b9c0d1e2f3a4
Create Date: 2026-11-28
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "b9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "release_tracks",
        sa.Column("musicbrainz_recording_id", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_release_tracks_musicbrainz_recording_id",
        "release_tracks",
        ["musicbrainz_recording_id"],
    )
    # Re-enrich completed releases once to backfill provider recording IDs.
    op.execute(
        sa.text(
            "UPDATE release_enrichment_jobs "
            "SET status = 'pending', available_at = CURRENT_TIMESTAMP, "
            "locked_at = NULL WHERE status = 'completed'"
        )
    )


def downgrade() -> None:
    op.drop_index(
        "ix_release_tracks_musicbrainz_recording_id",
        table_name="release_tracks",
    )
    op.drop_column("release_tracks", "musicbrainz_recording_id")
