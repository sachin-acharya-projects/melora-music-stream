"""add canonical artist identities and conservative classification

Revision ID: a8c9d1e2f3b4
Revises: f1a2b3c4d5e6
Create Date: 2026-11-27
"""

from datetime import UTC, datetime
import uuid
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a8c9d1e2f3b4"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("artists", sa.Column("entity_type", sa.String(), nullable=False, server_default="unknown"))
    op.add_column("artists", sa.Column("identity_status", sa.String(), nullable=False, server_default="unverified"))
    op.add_column("artists", sa.Column("identity_confidence", sa.Float(), nullable=True))
    op.add_column("artists", sa.Column("identity_source", sa.String(), nullable=True))
    op.create_index("ix_artists_entity_type", "artists", ["entity_type"], unique=False)
    op.create_index("ix_artists_identity_status", "artists", ["identity_status"], unique=False)

    op.create_table(
        "artist_identities",
        sa.Column("artist_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("provider_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["artist_id"], ["artists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "external_id", name="uq_artist_identity_provider_external"),
    )
    op.create_index("ix_artist_identities_artist_provider", "artist_identities", ["artist_id", "provider"], unique=False)
    op.create_index("ix_artist_identities_id", "artist_identities", ["id"], unique=False)

    # Preserve legacy JSON values while copying provider IDs into normalized rows.
    bind = op.get_bind()
    artists = sa.table(
        "artists", sa.column("id", sa.String()),
        sa.column("external_ids", sa.JSON()), sa.column("created_at", sa.DateTime()),
    )
    identities = sa.table(
        "artist_identities", sa.column("id", sa.String()),
        sa.column("artist_id", sa.String()), sa.column("provider", sa.String()),
        sa.column("external_id", sa.String()), sa.column("is_primary", sa.Boolean()),
        sa.column("provider_metadata", sa.JSON()), sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )
    seen: set[tuple[str, str]] = set()
    rows = bind.execute(
        sa.select(artists.c.id, artists.c.external_ids, artists.c.created_at)
        .order_by(artists.c.created_at, artists.c.id)
    ).mappings()
    now = datetime.now(UTC).replace(tzinfo=None)
    provider_keys = {
        "musicbrainz_id": "musicbrainz",
        "youtube_channel_id": "youtube_channel",
        "ytmusic_artist_id": "youtube_music_artist",
        "lastfm_id": "lastfm",
        "spotify_id": "spotify",
    }
    for row in rows:
        values = row["external_ids"] or {}
        if not isinstance(values, dict):
            continue
        for key, provider in provider_keys.items():
            external_id = values.get(key)
            if not external_id:
                continue
            external_id = str(external_id)
            identity_key = (provider, external_id)
            if identity_key in seen:
                continue
            seen.add(identity_key)
            bind.execute(identities.insert().values(
                id=str(uuid.uuid4()), artist_id=row["id"], provider=provider,
                external_id=external_id, is_primary=True, provider_metadata=None,
                created_at=now, updated_at=now,
            ))


def downgrade() -> None:
    op.drop_index("ix_artist_identities_id", table_name="artist_identities")
    op.drop_index("ix_artist_identities_artist_provider", table_name="artist_identities")
    op.drop_table("artist_identities")
    op.drop_index("ix_artists_identity_status", table_name="artists")
    op.drop_index("ix_artists_entity_type", table_name="artists")
    op.drop_column("artists", "identity_source")
    op.drop_column("artists", "identity_confidence")
    op.drop_column("artists", "identity_status")
    op.drop_column("artists", "entity_type")
