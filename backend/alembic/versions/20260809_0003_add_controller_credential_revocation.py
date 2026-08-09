"""Add controller credential revocation.

Revision ID: 20260809_0003
Revises: 20260809_0002
Create Date: 2026-08-09 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260809_0003"
down_revision: Union[str, Sequence[str], None] = "20260809_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "controller_credentials",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("controller_credentials", "revoked_at")
