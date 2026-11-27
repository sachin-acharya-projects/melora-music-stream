"""link favorited album snapshots to canonical releases

Revision ID: d3e5f7a9b1c2
Revises: c2d4e6f8a0b1
Create Date: 2026-11-27
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "d3e5f7a9b1c2"
down_revision: Union[str, Sequence[str], None] = "c2d4e6f8a0b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("albums", sa.Column("release_id", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_albums_release_id_releases",
        "albums",
        "releases",
        ["release_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_albums_release_id", "albums", ["release_id"], unique=False)

    # Backfill only when a browse ID maps to exactly one release globally.
    # Ambiguous records intentionally remain unlinked for later reconciliation.
    bind = op.get_bind()
    albums = sa.table(
        "albums",
        sa.column("id", sa.String()),
        sa.column("browse_id", sa.String()),
        sa.column("release_id", sa.String()),
    )
    releases = sa.table(
        "releases",
        sa.column("id", sa.String()),
        sa.column("browse_id", sa.String()),
    )
    candidate = (
        sa.select(releases.c.id)
        .where(releases.c.browse_id == albums.c.browse_id)
        .limit(2)
        .scalar_subquery()
    )
    count_matches = (
        sa.select(sa.func.count())
        .select_from(releases)
        .where(releases.c.browse_id == albums.c.browse_id)
        .scalar_subquery()
    )
    bind.execute(
        albums.update()
        .where(count_matches == 1)
        .values(release_id=candidate)
    )


def downgrade() -> None:
    op.drop_index("ix_albums_release_id", table_name="albums")
    op.drop_constraint("fk_albums_release_id_releases", "albums", type_="foreignkey")
    op.drop_column("albums", "release_id")
