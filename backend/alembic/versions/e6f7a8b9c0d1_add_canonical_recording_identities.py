"""add canonical recording entities and source identity mapping

Revision ID: e6f7a8b9c0d1
Revises: d3e5f7a9b1c2
Create Date: 2026-11-27
"""

from datetime import UTC, datetime
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "d3e5f7a9b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recordings",
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("first_release_date", sa.Date(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recordings_id", "recordings", ["id"], unique=False)

    op.create_table(
        "recording_identities",
        sa.Column("recording_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("identity_type", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("provider_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["recording_id"], ["recordings.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "identity_type",
            "external_id",
            name="uq_recording_identity_provider_type_external",
        ),
    )
    op.create_index(
        "ix_recording_identities_recording_id",
        "recording_identities",
        ["recording_id"],
        unique=False,
    )

    op.add_column("songs", sa.Column("recording_id", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_songs_recording_id_recordings",
        "songs",
        "recordings",
        ["recording_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_songs_recording_id", "songs", ["recording_id"], unique=False)

    # Preserve every existing playable song. Each gets a provisional recording
    # row and a YouTube video identity; no cross-song matching or merging occurs.
    bind = op.get_bind()
    songs = sa.table(
        "songs",
        sa.column("id", sa.String()),
        sa.column("title", sa.String()),
        sa.column("duration", sa.Integer()),
        sa.column("recording_id", sa.String()),
    )
    recordings = sa.table(
        "recordings",
        sa.column("id", sa.String()),
        sa.column("title", sa.String()),
        sa.column("duration", sa.Integer()),
        sa.column("first_release_date", sa.Date()),
        sa.column("metadata", sa.JSON()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )
    identities = sa.table(
        "recording_identities",
        sa.column("id", sa.String()),
        sa.column("recording_id", sa.String()),
        sa.column("provider", sa.String()),
        sa.column("identity_type", sa.String()),
        sa.column("external_id", sa.String()),
        sa.column("provider_metadata", sa.JSON()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )

    now = datetime.now(UTC).replace(tzinfo=None)
    rows = bind.execute(
        sa.select(songs.c.id, songs.c.title, songs.c.duration)
    ).mappings()
    for row in rows:
        recording_id = str(uuid4())
        bind.execute(
            recordings.insert().values(
                id=recording_id,
                title=row["title"],
                duration=row["duration"],
                first_release_date=None,
                metadata={"identity_status": "provisional"},
                created_at=now,
                updated_at=now,
            )
        )
        bind.execute(
            songs.update()
            .where(songs.c.id == row["id"])
            .values(recording_id=recording_id)
        )
        bind.execute(
            identities.insert().values(
                id=str(uuid4()),
                recording_id=recording_id,
                provider="youtube",
                identity_type="video_id",
                external_id=str(row["id"]),
                provider_metadata=None,
                created_at=now,
                updated_at=now,
            )
        )


def downgrade() -> None:
    op.drop_index("ix_songs_recording_id", table_name="songs")
    op.drop_constraint("fk_songs_recording_id_recordings", "songs", type_="foreignkey")
    op.drop_column("songs", "recording_id")
    op.drop_index(
        "ix_recording_identities_recording_id", table_name="recording_identities"
    )
    op.drop_table("recording_identities")
    op.drop_index("ix_recordings_id", table_name="recordings")
    op.drop_table("recordings")
