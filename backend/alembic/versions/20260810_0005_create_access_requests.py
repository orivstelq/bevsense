"""Create access requests.

Revision ID: 20260810_0005
Revises: 20260809_0004
Create Date: 2026-08-10 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260810_0005"
down_revision: Union[str, Sequence[str], None] = "20260809_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "access_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("auth_user_id", sa.Uuid(), nullable=False),
        sa.Column("verified_email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("requested_organization_id", sa.String(length=255), nullable=False),
        sa.Column("requested_location_id", sa.String(length=255), nullable=False),
        sa.Column("requested_role", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("approved_role", sa.String(length=32), nullable=True),
        sa.Column("approved_location_id", sa.String(length=255), nullable=True),
        sa.Column("reviewed_by_auth_user_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "requested_role IN ('utility-worker', 'supervisor-manager', 'technician')",
            name="ck_access_requests_requested_role",
        ),
        sa.CheckConstraint(
            "approved_role IS NULL OR approved_role IN "
            "('utility-worker', 'supervisor-manager', 'technician')",
            name="ck_access_requests_approved_role",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_access_requests_status",
        ),
        sa.CheckConstraint(
            "(status = 'pending' AND approved_role IS NULL AND "
            "approved_location_id IS NULL AND reviewed_by_auth_user_id IS NULL "
            "AND reviewed_at IS NULL) OR "
            "(status = 'approved' AND approved_role IS NOT NULL AND "
            "reviewed_by_auth_user_id IS NOT NULL AND reviewed_at IS NOT NULL) OR "
            "(status = 'rejected' AND approved_role IS NULL AND "
            "approved_location_id IS NULL AND reviewed_by_auth_user_id IS NOT NULL "
            "AND reviewed_at IS NOT NULL)",
            name="ck_access_requests_lifecycle",
        ),
        sa.CheckConstraint(
            "approved_role IS NULL OR "
            "(approved_role = 'supervisor-manager' AND "
            "approved_location_id IS NULL) OR "
            "(approved_role IN ('utility-worker', 'technician') AND "
            "approved_location_id IS NOT NULL)",
            name="ck_access_requests_approved_location_requirement",
        ),
        sa.ForeignKeyConstraint(
            ["auth_user_id"],
            ["user_profiles.auth_user_id"],
            name="fk_access_requests_profile",
        ),
        sa.ForeignKeyConstraint(
            ["requested_organization_id"],
            ["organizations.id"],
            name="fk_access_requests_organization",
        ),
        sa.ForeignKeyConstraint(
            ["requested_organization_id", "requested_location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_access_requests_requested_location_scope",
        ),
        sa.ForeignKeyConstraint(
            ["requested_organization_id", "approved_location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_access_requests_approved_location_scope",
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by_auth_user_id"],
            ["user_profiles.auth_user_id"],
            name="fk_access_requests_reviewer",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_user_id", name="uq_access_requests_auth_user_id"),
    )
    op.create_index(
        "ix_access_requests_status_organization",
        "access_requests",
        ["status", "requested_organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_access_requests_status_organization",
        table_name="access_requests",
    )
    op.drop_table("access_requests")
