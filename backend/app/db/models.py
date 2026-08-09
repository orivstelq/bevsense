from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OrganizationRecord(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class LocationRecord(Base):
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "id",
            name="uq_locations_organization_id_id",
        ),
        Index("ix_locations_organization_id", "organization_id"),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("organizations.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class ControllerRecord(Base):
    __tablename__ = "controllers"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_controllers_location_scope",
        ),
        UniqueConstraint(
            "organization_id",
            "location_id",
            "id",
            name="uq_controllers_scope_id",
        ),
        CheckConstraint(
            "status IN ('online', 'offline', 'unknown')",
            name="ck_controllers_status",
        ),
        Index(
            "ix_controllers_location_scope",
            "organization_id",
            "location_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    firmware_version: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )


class ControllerCredentialRecord(Base):
    __tablename__ = "controller_credentials"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "location_id", "controller_id"],
            [
                "controllers.organization_id",
                "controllers.location_id",
                "controllers.id",
            ],
            name="fk_controller_credentials_controller_scope",
        ),
        UniqueConstraint(
            "token_sha256",
            name="uq_controller_credentials_token_sha256",
        ),
        Index(
            "ix_controller_credentials_controller_scope",
            "organization_id",
            "location_id",
            "controller_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    controller_id: Mapped[str] = mapped_column(String(255), nullable=False)
    token_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class SensorTrayRecord(Base):
    __tablename__ = "sensor_trays"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "location_id", "controller_id"],
            [
                "controllers.organization_id",
                "controllers.location_id",
                "controllers.id",
            ],
            name="fk_sensor_trays_controller_scope",
        ),
        UniqueConstraint(
            "organization_id",
            "location_id",
            "id",
            name="uq_sensor_trays_scope_id",
        ),
        UniqueConstraint(
            "organization_id",
            "location_id",
            "controller_id",
            "id",
            name="uq_sensor_trays_controller_scope_id",
        ),
        CheckConstraint(
            "family IN ('2.5-gallon', '5-gallon')",
            name="ck_sensor_trays_family",
        ),
        CheckConstraint(
            "status IN ('ready', 'offline', 'fault', 'unknown')",
            name="ck_sensor_trays_status",
        ),
        Index(
            "ix_sensor_trays_controller_scope",
            "organization_id",
            "location_id",
            "controller_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    controller_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    family: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)


class InventoryItemRecord(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "location_id", "tray_id"],
            [
                "sensor_trays.organization_id",
                "sensor_trays.location_id",
                "sensor_trays.id",
            ],
            name="fk_inventory_items_tray_scope",
        ),
        UniqueConstraint(
            "organization_id",
            "location_id",
            "tray_id",
            name="uq_inventory_items_current_tray",
        ),
        CheckConstraint(
            "container_size_gallons IN (2.5, 5.0)",
            name="ck_inventory_items_container_size",
        ),
        CheckConstraint(
            "tare_weight_grams >= 0",
            name="ck_inventory_items_tare_weight",
        ),
        CheckConstraint(
            "full_product_weight_grams > 0",
            name="ck_inventory_items_full_product_weight",
        ),
        Index(
            "ix_inventory_items_location_scope",
            "organization_id",
            "location_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    tray_id: Mapped[str] = mapped_column(String(255), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    container_size_gallons: Mapped[float] = mapped_column(Float, nullable=False)
    tare_weight_grams: Mapped[float] = mapped_column(Float, nullable=False)
    full_product_weight_grams: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    installed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class TelemetryReadingRecord(Base):
    __tablename__ = "telemetry_readings"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "location_id", "controller_id", "tray_id"],
            [
                "sensor_trays.organization_id",
                "sensor_trays.location_id",
                "sensor_trays.controller_id",
                "sensor_trays.id",
            ],
            name="fk_telemetry_readings_tray_controller_scope",
        ),
        CheckConstraint(
            "gross_weight_grams >= 0",
            name="ck_telemetry_readings_gross_weight",
        ),
        CheckConstraint(
            "data_source IN ('simulated', 'live')",
            name="ck_telemetry_readings_data_source",
        ),
        Index(
            "ix_telemetry_readings_location_timestamp",
            "organization_id",
            "location_id",
            "timestamp",
        ),
        Index(
            "ix_telemetry_readings_tray_timestamp",
            "organization_id",
            "location_id",
            "tray_id",
            "timestamp",
        ),
    )

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    controller_id: Mapped[str] = mapped_column(String(255), nullable=False)
    tray_id: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    gross_weight_grams: Mapped[float] = mapped_column(Float, nullable=False)
    data_source: Mapped[str] = mapped_column(String(32), nullable=False)
