"""Create human access schema.

Revision ID: 20260809_0004
Revises: 20260809_0003
Create Date: 2026-08-09 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260809_0004"
down_revision: Union[str, Sequence[str], None] = "20260809_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("auth_user_id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column(
            "preferred_language",
            sa.String(length=8),
            server_default="en",
            nullable=False,
        ),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "preferred_language IN ('en', 'es')",
            name="ck_user_profiles_preferred_language",
        ),
        sa.PrimaryKeyConstraint("auth_user_id"),
    )
    op.create_table(
        "organization_memberships",
        sa.Column("auth_user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "role IN ('utility-worker', 'supervisor-manager', "
            "'organization-admin', 'technician')",
            name="ck_organization_memberships_role",
        ),
        sa.ForeignKeyConstraint(
            ["auth_user_id"],
            ["user_profiles.auth_user_id"],
            name="fk_organization_memberships_profile",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_organization_memberships_organization",
        ),
        sa.PrimaryKeyConstraint("auth_user_id", "organization_id"),
    )
    op.create_index(
        "ix_organization_memberships_organization_id",
        "organization_memberships",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "location_assignments",
        sa.Column("auth_user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["auth_user_id", "organization_id"],
            [
                "organization_memberships.auth_user_id",
                "organization_memberships.organization_id",
            ],
            name="fk_location_assignments_membership",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_location_assignments_location_scope",
        ),
        sa.PrimaryKeyConstraint(
            "auth_user_id", "organization_id", "location_id"
        ),
    )
    op.create_index(
        "ix_location_assignments_location_scope",
        "location_assignments",
        ["organization_id", "location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_location_assignments_location_scope",
        table_name="location_assignments",
    )
    op.drop_table("location_assignments")
    op.drop_index(
        "ix_organization_memberships_organization_id",
        table_name="organization_memberships",
    )
    op.drop_table("organization_memberships")
    op.drop_table("user_profiles")
