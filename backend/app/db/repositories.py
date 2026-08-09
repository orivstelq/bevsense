from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    ControllerRecord,
    InventoryItemRecord,
    LocationRecord,
    OrganizationRecord,
    SensorTrayRecord,
    TelemetryReadingRecord,
)


@dataclass(frozen=True, slots=True)
class PersistedLocationState:
    organization: OrganizationRecord
    location: LocationRecord
    controllers: tuple[ControllerRecord, ...]
    sensor_trays: tuple[SensorTrayRecord, ...]
    inventory_items: tuple[InventoryItemRecord, ...]
    telemetry_readings: tuple[TelemetryReadingRecord, ...]


class TelemetryRepository:
    def get_location_state(
        self,
        session: Session,
        organization_id: str,
        location_id: str,
    ) -> PersistedLocationState | None:
        organization = session.get(OrganizationRecord, organization_id)
        location = session.scalar(
            select(LocationRecord).where(
                LocationRecord.id == location_id,
                LocationRecord.organization_id == organization_id,
            )
        )
        if organization is None or location is None:
            return None

        scope_filters = (
            lambda model: (
                model.organization_id == organization_id,
                model.location_id == location_id,
            )
        )
        controllers = session.scalars(
            select(ControllerRecord)
            .where(*scope_filters(ControllerRecord))
            .order_by(ControllerRecord.id)
        ).all()
        sensor_trays = session.scalars(
            select(SensorTrayRecord)
            .where(*scope_filters(SensorTrayRecord))
            .order_by(SensorTrayRecord.id)
        ).all()
        inventory_items = session.scalars(
            select(InventoryItemRecord)
            .where(*scope_filters(InventoryItemRecord))
            .order_by(InventoryItemRecord.id)
        ).all()
        telemetry_readings = session.scalars(
            select(TelemetryReadingRecord)
            .where(*scope_filters(TelemetryReadingRecord))
            .order_by(TelemetryReadingRecord.timestamp, TelemetryReadingRecord.id)
        ).all()

        return PersistedLocationState(
            organization=organization,
            location=location,
            controllers=tuple(controllers),
            sensor_trays=tuple(sensor_trays),
            inventory_items=tuple(inventory_items),
            telemetry_readings=tuple(telemetry_readings),
        )
