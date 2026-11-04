"""add machine clients and explicit per-user grants"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d0e1f2a3b4c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "machine_clients",
        sa.Column("owner_user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("service_identity", sa.String(128), nullable=False),
        sa.Column("client_id", sa.String(80), nullable=False),
        sa.Column("client_secret_hash", sa.String(64), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_identity"),
        sa.UniqueConstraint("client_id"),
    )
    op.create_index("ix_machine_clients_id", "machine_clients", ["id"])
    op.create_index("ix_machine_clients_id", "machine_clients", ["id"])
    op.create_index("ix_machine_clients_owner_user_id", "machine_clients", ["owner_user_id"])
    op.create_index("ix_machine_clients_service_identity", "machine_clients", ["service_identity"])
    op.create_index("ix_machine_clients_client_id", "machine_clients", ["client_id"])
    op.create_index("ix_machine_clients_expires_at", "machine_clients", ["expires_at"])
    op.create_table(
        "machine_user_grants",
        sa.Column("machine_client_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["machine_client_id"], ["machine_clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("machine_client_id", "user_id", name="uq_machine_user_grant_client_user"),
    )
    op.create_index("ix_machine_user_grants_id", "machine_user_grants", ["id"])
    op.create_index("ix_machine_user_grants_id", "machine_user_grants", ["id"])
    op.create_index("ix_machine_user_grants_machine_client_id", "machine_user_grants", ["machine_client_id"])
    op.create_index("ix_machine_user_grants_user_id", "machine_user_grants", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_machine_user_grants_user_id", table_name="machine_user_grants")
    op.drop_index("ix_machine_user_grants_machine_client_id", table_name="machine_user_grants")
    op.drop_index("ix_machine_user_grants_id", table_name="machine_user_grants")
    op.drop_index("ix_machine_user_grants_user_id", table_name="machine_user_grants")
    op.drop_index("ix_machine_user_grants_machine_client_id", table_name="machine_user_grants")
    op.drop_index("ix_machine_user_grants_id", table_name="machine_user_grants")
    op.drop_table("machine_user_grants")
    op.drop_index("ix_machine_clients_expires_at", table_name="machine_clients")
    op.drop_index("ix_machine_clients_client_id", table_name="machine_clients")
    op.drop_index("ix_machine_clients_service_identity", table_name="machine_clients")
    op.drop_index("ix_machine_clients_owner_user_id", table_name="machine_clients")
    op.drop_index("ix_machine_clients_id", table_name="machine_clients")
    op.drop_index("ix_machine_clients_expires_at", table_name="machine_clients")
    op.drop_index("ix_machine_clients_client_id", table_name="machine_clients")
    op.drop_index("ix_machine_clients_service_identity", table_name="machine_clients")
    op.drop_index("ix_machine_clients_owner_user_id", table_name="machine_clients")
    op.drop_index("ix_machine_clients_id", table_name="machine_clients")
    op.drop_table("machine_clients")
