"""add provider identities for releases

Revision ID: c2d4e6f8a0b1
Revises: b7c9d2e4f6a1
Create Date: 2026-11-27
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "c2d4e6f8a0b1"
down_revision: Union[str, Sequence[str], None] = "b7c9d2e4f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "release_identities",
        sa.Column("release_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("identity_type", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("provider_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["release_id"], ["releases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "release_id",
            "provider",
            "identity_type",
            "external_id",
            name="uq_release_identity_release_provider_type_external",
        ),
    )
    op.create_index(
        "ix_release_identities_provider_lookup",
        "release_identities",
        ["provider", "identity_type", "external_id"],
        unique=False,
    )
    op.create_index(
        "ix_release_identities_release_id",
        "release_identities",
        ["release_id"],
        unique=False,
    )

    # Backfill the provider-specific IDs already stored on releases. Do not
    # impose global uniqueness on provider IDs yet: legacy rows can represent
    # duplicate catalogue entries that need a separate reconciliation pass.
    bind = op.get_bind()
    releases = sa.table(
        "releases",
        sa.column("id", sa.String()),
        sa.column("browse_id", sa.String()),
        sa.column("audio_playlist_id", sa.String()),
    )
    identities = sa.table(
        "release_identities",
        sa.column("id", sa.String()),
        sa.column("release_id", sa.String()),
        sa.column("provider", sa.String()),
        sa.column("identity_type", sa.String()),
        sa.column("external_id", sa.String()),
        sa.column("provider_metadata", sa.JSON()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )
    from uuid import uuid4
    from datetime import UTC, datetime

    now = datetime.now(UTC).replace(tzinfo=None)
    rows = bind.execute(
        sa.select(
            releases.c.id,
            releases.c.browse_id,
            releases.c.audio_playlist_id,
        )
    ).mappings()
    for row in rows:
        for identity_type, external_id in (
            ("browse_id", row["browse_id"]),
            ("audio_playlist_id", row["audio_playlist_id"]),
        ):
            if not external_id:
                continue
            bind.execute(
                identities.insert().values(
                    id=str(uuid4()),
                    release_id=row["id"],
                    provider="youtube_music",
                    identity_type=identity_type,
                    external_id=str(external_id),
                    provider_metadata=None,
                    created_at=now,
                    updated_at=now,
                )
            )


def downgrade() -> None:
    op.drop_index("ix_release_identities_release_id", table_name="release_identities")
    op.drop_index(
        "ix_release_identities_provider_lookup", table_name="release_identities"
    )
    op.drop_table("release_identities")
