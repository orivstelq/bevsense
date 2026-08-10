from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Uuid,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OrganizationRecord(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class UserProfileRecord(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint(
            "preferred_language IN ('en', 'es')",
            name="ck_user_profiles_preferred_language",
        ),
    )

    auth_user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_language: Mapped[str] = mapped_column(
        String(8), nullable=False, default="en"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


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


class OrganizationMembershipRecord(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        CheckConstraint(
            "role IN ('utility-worker', 'supervisor-manager', "
            "'organization-admin', 'technician')",
            name="ck_organization_memberships_role",
        ),
        ForeignKeyConstraint(
            ["auth_user_id"],
            ["user_profiles.auth_user_id"],
            name="fk_organization_memberships_profile",
            ondelete="CASCADE",
        ),
        Index("ix_organization_memberships_organization_id", "organization_id"),
    )

    auth_user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("organizations.id"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class LocationAssignmentRecord(Base):
    __tablename__ = "location_assignments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["auth_user_id", "organization_id"],
            [
                "organization_memberships.auth_user_id",
                "organization_memberships.organization_id",
            ],
            name="fk_location_assignments_membership",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["organization_id", "location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_location_assignments_location_scope",
        ),
        Index(
            "ix_location_assignments_location_scope",
            "organization_id",
            "location_id",
        ),
    )

    auth_user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    location_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class AccessRequestRecord(Base):
    __tablename__ = "access_requests"
    __table_args__ = (
        CheckConstraint(
            "requested_role IN ('utility-worker', 'supervisor-manager', "
            "'technician')",
            name="ck_access_requests_requested_role",
        ),
        CheckConstraint(
            "approved_role IS NULL OR approved_role IN "
            "('utility-worker', 'supervisor-manager', 'technician')",
            name="ck_access_requests_approved_role",
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_access_requests_status",
        ),
        CheckConstraint(
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
        CheckConstraint(
            "approved_role IS NULL OR "
            "(approved_role = 'supervisor-manager' AND "
            "approved_location_id IS NULL) OR "
            "(approved_role IN ('utility-worker', 'technician') AND "
            "approved_location_id IS NOT NULL)",
            name="ck_access_requests_approved_location_requirement",
        ),
        ForeignKeyConstraint(
            ["requested_organization_id", "requested_location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_access_requests_requested_location_scope",
        ),
        ForeignKeyConstraint(
            ["requested_organization_id", "approved_location_id"],
            ["locations.organization_id", "locations.id"],
            name="fk_access_requests_approved_location_scope",
        ),
        Index(
            "ix_access_requests_status_organization",
            "status",
            "requested_organization_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    auth_user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("user_profiles.auth_user_id"),
        nullable=False,
        unique=True,
    )
    verified_email: Mapped[str] = mapped_column(String(320), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_organization_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("organizations.id"), nullable=False
    )
    requested_location_id: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    approved_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    approved_location_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    reviewed_by_auth_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("user_profiles.auth_user_id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


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
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
