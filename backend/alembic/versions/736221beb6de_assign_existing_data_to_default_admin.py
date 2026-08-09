"""assign_existing_data_to_default_admin

Revision ID: 736221beb6de
Revises: b22d0410d9b7
Create Date: 2026-07-28 23:29:49.977329

"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "736221beb6de"
down_revision: str | None = "b22d0410d9b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def get_default_admin_id(connection: sa.Connection) -> str:
    """Get or create the default admin user and return its id."""
    result = connection.execute(
        text("SELECT id FROM users WHERE email = 'admin@melora.local' LIMIT 1")
    ).fetchone()

    if result:
        return result[0]

    admin_id = str(uuid4())
    connection.execute(
        text("""
            INSERT INTO users (id, email, username, display_name, role, is_active, favorite_genres, privacy_settings, created_at, updated_at)
            VALUES (:id, :email, :username, :display_name, :role, :is_active, :favorite_genres, :privacy_settings, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """),
        {
            "id": admin_id,
            "email": "admin@melora.local",
            "username": "admin",
            "display_name": "Default Admin",
            "role": "admin",
            "is_active": True,
            "favorite_genres": "[]",
            "privacy_settings": '{"profile_public": true, "listening_history_visible": false}',
        },
    )
    return admin_id


def upgrade() -> None:
    """Upgrade schema."""
    connection = op.get_bind()

    # Create FK constraint on playlists.user_id -> users.id (batch mode for SQLite)
    with op.batch_alter_table("playlists") as batch_op:
        batch_op.create_foreign_key(
            "fk_playlists_user_id", "users", ["user_id"], ["id"]
        )

    # Create default admin user and assign orphaned records
    admin_id = get_default_admin_id(connection)

    connection.execute(
        text("UPDATE playlists SET user_id = :admin_id WHERE user_id IS NULL"),
        {"admin_id": admin_id},
    )
    connection.execute(
        text("UPDATE playback_state SET user_id = :admin_id WHERE user_id IS NULL"),
        {"admin_id": admin_id},
    )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("playlists") as batch_op:
        batch_op.drop_constraint("fk_playlists_user_id", type_="foreignkey")
