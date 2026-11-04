"""add webhook subscriptions and durable delivery outbox"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f2a3b4c5d6e7"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "webhook_subscriptions",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("endpoint_url", sa.String(2048), nullable=False),
        sa.Column("secret_encrypted", sa.Text(), nullable=False),
        sa.Column("events", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_webhook_subscriptions_id", "webhook_subscriptions", ["id"])
    op.create_index("ix_webhook_subscriptions_user_id", "webhook_subscriptions", ["user_id"])

    op.create_table(
        "webhook_deliveries",
        sa.Column("subscription_id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(64), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["subscription_id"], ["webhook_subscriptions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subscription_id", "event_id", name="uq_webhook_delivery_subscription_event"),
    )
    op.create_index("ix_webhook_deliveries_id", "webhook_deliveries", ["id"])
    op.create_index("ix_webhook_deliveries_subscription_id", "webhook_deliveries", ["subscription_id"])
    op.create_index("ix_webhook_deliveries_event_id", "webhook_deliveries", ["event_id"])
    op.create_index("ix_webhook_deliveries_event_type", "webhook_deliveries", ["event_type"])
    op.create_index("ix_webhook_deliveries_status", "webhook_deliveries", ["status"])
    op.create_index("ix_webhook_deliveries_next_attempt_at", "webhook_deliveries", ["next_attempt_at"])


def downgrade() -> None:
    op.drop_index("ix_webhook_deliveries_next_attempt_at", table_name="webhook_deliveries")
    op.drop_index("ix_webhook_deliveries_status", table_name="webhook_deliveries")
    op.drop_index("ix_webhook_deliveries_event_type", table_name="webhook_deliveries")
    op.drop_index("ix_webhook_deliveries_event_id", table_name="webhook_deliveries")
    op.drop_index("ix_webhook_deliveries_subscription_id", table_name="webhook_deliveries")
    op.drop_index("ix_webhook_deliveries_id", table_name="webhook_deliveries")
    op.drop_table("webhook_deliveries")
    op.drop_index("ix_webhook_subscriptions_user_id", table_name="webhook_subscriptions")
    op.drop_index("ix_webhook_subscriptions_id", table_name="webhook_subscriptions")
    op.drop_table("webhook_subscriptions")
