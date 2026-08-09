"""Create telemetry persistence schema.

Revision ID: 20260808_0001
Revises:
Create Date: 2026-08-08 00:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260808_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "locations",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "id",
            name="uq_locations_organization_id_id",
        ),
    )
    op.create_index(
        "ix_locations_organization_id",
        "locations",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "controllers",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("firmware_version", sa.String(length=255), nullable=True),
        sa.CheckConstraint(
            "status IN ('online', 'offline', 'unknown')",
            name="ck_controllers_status",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_controllers_location_scope",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "location_id",
            "id",
            name="uq_controllers_scope_id",
        ),
    )
    op.create_index(
        "ix_controllers_location_scope",
        "controllers",
        ["organization_id", "location_id"],
        unique=False,
    )
    op.create_table(
        "sensor_trays",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("controller_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("family", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "family IN ('2.5-gallon', '5-gallon')",
            name="ck_sensor_trays_family",
        ),
        sa.CheckConstraint(
            "status IN ('ready', 'offline', 'fault', 'unknown')",
            name="ck_sensor_trays_status",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "location_id", "controller_id"],
            [
                "controllers.organization_id",
                "controllers.location_id",
                "controllers.id",
            ],
            name="fk_sensor_trays_controller_scope",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "location_id",
            "controller_id",
            "id",
            name="uq_sensor_trays_controller_scope_id",
        ),
        sa.UniqueConstraint(
            "organization_id",
            "location_id",
            "id",
            name="uq_sensor_trays_scope_id",
        ),
    )
    op.create_index(
        "ix_sensor_trays_controller_scope",
        "sensor_trays",
        ["organization_id", "location_id", "controller_id"],
        unique=False,
    )
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("tray_id", sa.String(length=255), nullable=False),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("container_size_gallons", sa.Float(), nullable=False),
        sa.Column("tare_weight_grams", sa.Float(), nullable=False),
        sa.Column("full_product_weight_grams", sa.Float(), nullable=False),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "container_size_gallons IN (2.5, 5.0)",
            name="ck_inventory_items_container_size",
        ),
        sa.CheckConstraint(
            "full_product_weight_grams > 0",
            name="ck_inventory_items_full_product_weight",
        ),
        sa.CheckConstraint(
            "tare_weight_grams >= 0",
            name="ck_inventory_items_tare_weight",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "location_id", "tray_id"],
            [
                "sensor_trays.organization_id",
                "sensor_trays.location_id",
                "sensor_trays.id",
            ],
            name="fk_inventory_items_tray_scope",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "location_id",
            "tray_id",
            name="uq_inventory_items_current_tray",
        ),
    )
    op.create_index(
        "ix_inventory_items_location_scope",
        "inventory_items",
        ["organization_id", "location_id"],
        unique=False,
    )
    op.create_table(
        "telemetry_readings",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.String(length=255), nullable=False),
        sa.Column("controller_id", sa.String(length=255), nullable=False),
        sa.Column("tray_id", sa.String(length=255), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("gross_weight_grams", sa.Float(), nullable=False),
        sa.Column("data_source", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "data_source IN ('simulated', 'live')",
            name="ck_telemetry_readings_data_source",
        ),
        sa.CheckConstraint(
            "gross_weight_grams >= 0",
            name="ck_telemetry_readings_gross_weight",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "location_id", "controller_id", "tray_id"],
            [
                "sensor_trays.organization_id",
                "sensor_trays.location_id",
                "sensor_trays.controller_id",
                "sensor_trays.id",
            ],
            name="fk_telemetry_readings_tray_controller_scope",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_telemetry_readings_location_timestamp",
        "telemetry_readings",
        ["organization_id", "location_id", "timestamp"],
        unique=False,
    )
    op.create_index(
        "ix_telemetry_readings_tray_timestamp",
        "telemetry_readings",
        ["organization_id", "location_id", "tray_id", "timestamp"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_telemetry_readings_tray_timestamp",
        table_name="telemetry_readings",
    )
    op.drop_index(
        "ix_telemetry_readings_location_timestamp",
        table_name="telemetry_readings",
    )
    op.drop_table("telemetry_readings")
    op.drop_index(
        "ix_inventory_items_location_scope",
        table_name="inventory_items",
    )
    op.drop_table("inventory_items")
    op.drop_index(
        "ix_sensor_trays_controller_scope",
        table_name="sensor_trays",
    )
    op.drop_table("sensor_trays")
    op.drop_index(
        "ix_controllers_location_scope",
        table_name="controllers",
    )
    op.drop_table("controllers")
    op.drop_index(
        "ix_locations_organization_id",
        table_name="locations",
    )
    op.drop_table("locations")
    op.drop_table("organizations")
