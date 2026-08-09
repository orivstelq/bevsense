"""Create controller credentials.

Revision ID: 20260809_0002
Revises: 20260808_0001
Create Date: 2026-08-09 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260809_0002"
down_revision: Union[str, Sequence[str], None] = "20260808_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "controller_credentials",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("controller_id", sa.String(length=255), nullable=False),
        sa.Column("token_sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id", "location_id", "controller_id"],
            [
                "controllers.organization_id",
                "controllers.location_id",
                "controllers.id",
            ],
            name="fk_controller_credentials_controller_scope",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "token_sha256",
            name="uq_controller_credentials_token_sha256",
        ),
    )
    op.create_index(
        "ix_controller_credentials_controller_scope",
        "controller_credentials",
        ["organization_id", "location_id", "controller_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_controller_credentials_controller_scope",
        table_name="controller_credentials",
    )
    op.drop_table("controller_credentials")
