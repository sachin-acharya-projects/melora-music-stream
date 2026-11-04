"""add OIDC provider and external identity foundation

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-11-04

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: str | None = "e5f6a7b8c9d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "oidc_providers",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("issuer", sa.String(length=2048), nullable=False),
        sa.Column("discovery_url", sa.String(length=2048), nullable=True),
        sa.Column("client_id", sa.String(length=1024), nullable=False),
        sa.Column("client_secret_encrypted", sa.Text(), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("button_label", sa.String(length=120), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("auto_provision", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("issuer"),
    )
    op.create_index("ix_oidc_providers_id", "oidc_providers", ["id"])
    op.create_index("ix_oidc_providers_name", "oidc_providers", ["name"])
    op.create_index("ix_oidc_providers_issuer", "oidc_providers", ["issuer"])

    op.create_table(
        "external_identities",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("provider_id", sa.String(), nullable=False),
        sa.Column("issuer", sa.String(length=2048), nullable=False),
        sa.Column("subject", sa.String(length=512), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["oidc_providers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("issuer", "subject", name="uq_external_identity_issuer_subject"),
        sa.UniqueConstraint("user_id", "provider_id", name="uq_external_identity_user_provider"),
    )
    op.create_index("ix_external_identities_id", "external_identities", ["id"])
    op.create_index("ix_external_identities_user_id", "external_identities", ["user_id"])
    op.create_index("ix_external_identities_provider_id", "external_identities", ["provider_id"])


def downgrade() -> None:
    op.drop_index("ix_external_identities_provider_id", table_name="external_identities")
    op.drop_index("ix_external_identities_user_id", table_name="external_identities")
    op.drop_index("ix_external_identities_id", table_name="external_identities")
    op.drop_table("external_identities")
    op.drop_index("ix_oidc_providers_issuer", table_name="oidc_providers")
    op.drop_index("ix_oidc_providers_name", table_name="oidc_providers")
    op.drop_index("ix_oidc_providers_id", table_name="oidc_providers")
    op.drop_table("oidc_providers")
