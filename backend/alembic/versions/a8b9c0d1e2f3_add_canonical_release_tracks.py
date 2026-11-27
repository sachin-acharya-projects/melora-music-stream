"""add canonical release track and multi-artist relationships

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-11-27
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a8b9c0d1e2f3"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "release_artist",
        sa.Column("release_id", sa.String(), nullable=False),
        sa.Column("artist_id", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("role", sa.String(), server_default="primary", nullable=False),
        sa.ForeignKeyConstraint(["release_id"], ["releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["artist_id"], ["artists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("release_id", "artist_id"),
    )
    op.create_index("ix_release_artist_artist_id", "release_artist", ["artist_id"])

    # Preserve the current primary artist as the first credited artist.
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "INSERT INTO release_artist (release_id, artist_id, position, role) "
            "SELECT id, artist_id, 0, 'primary' FROM releases "
            "WHERE artist_id IS NOT NULL"
        )
    )

    op.create_table(
        "release_tracks",
        sa.Column("release_id", sa.String(), nullable=False),
        sa.Column("recording_id", sa.String(), nullable=True),
        sa.Column("source_song_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("disc_number", sa.Integer(), server_default="1", nullable=False),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("musicbrainz_track_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["release_id"], ["releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recording_id"], ["recordings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["source_song_id"], ["songs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "release_id", "disc_number", "position",
            name="uq_release_track_disc_position",
        ),
    )
    op.create_index("ix_release_tracks_recording_id", "release_tracks", ["recording_id"])
    op.create_index("ix_release_tracks_source_song_id", "release_tracks", ["source_song_id"])


def downgrade() -> None:
    op.drop_index("ix_release_tracks_source_song_id", table_name="release_tracks")
    op.drop_index("ix_release_tracks_recording_id", table_name="release_tracks")
    op.drop_table("release_tracks")
    op.drop_index("ix_release_artist_artist_id", table_name="release_artist")
    op.drop_table("release_artist")
