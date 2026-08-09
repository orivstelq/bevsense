from datetime import UTC, datetime

from app.db.engine import SessionFactory
from app.db.repositories import TelemetryRepository
from app.models.telemetry import (
    Controller,
    InventoryItem,
    Location,
    LocationTelemetrySnapshot,
    Organization,
    SensorTray,
    TELEMETRY_SCHEMA_VERSION,
    TelemetryDataSource,
    TelemetryReading,
)


def _as_aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


class DatabaseTelemetryProvider:
    data_source = TelemetryDataSource.SIMULATED

    def __init__(
        self,
        session_factory: SessionFactory,
        repository: TelemetryRepository | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._repository = repository or TelemetryRepository()

    def get_snapshot(
        self,
        organization_id: str,
        location_id: str,
    ) -> LocationTelemetrySnapshot | None:
        with self._session_factory() as session:
            state = self._repository.get_location_state(
                session,
                organization_id,
                location_id,
            )
            if state is None:
                return None

            sources = {
                TelemetryDataSource(reading.data_source)
                for reading in state.telemetry_readings
            }
            if len(sources) > 1:
                raise ValueError(
                    "A location snapshot cannot mix telemetry data sources."
                )
            snapshot_source = next(iter(sources), self.data_source)

            return LocationTelemetrySnapshot(
                organization_id=organization_id,
                location_id=location_id,
                schema_version=TELEMETRY_SCHEMA_VERSION,
                organization=Organization(
                    id=state.organization.id,
                    name=state.organization.name,
                ),
                location=Location(
                    id=state.location.id,
                    organization_id=state.location.organization_id,
                    name=state.location.name,
                ),
                data_source=snapshot_source,
                controllers=tuple(
                    Controller(
                        id=record.id,
                        organization_id=record.organization_id,
                        location_id=record.location_id,
                        name=record.name,
                        status=record.status,
                        last_seen_at=_as_aware_utc(record.last_seen_at),
                        firmware_version=record.firmware_version,
                    )
                    for record in state.controllers
                ),
                sensor_trays=tuple(
                    SensorTray(
                        id=record.id,
                        organization_id=record.organization_id,
                        location_id=record.location_id,
                        controller_id=record.controller_id,
                        name=record.name,
                        family=record.family,
                        status=record.status,
                    )
                    for record in state.sensor_trays
                ),
                inventory_items=tuple(
                    InventoryItem(
                        id=record.id,
                        organization_id=record.organization_id,
                        location_id=record.location_id,
                        tray_id=record.tray_id,
                        product_name=record.product_name,
                        container_size_gallons=record.container_size_gallons,
                        tare_weight_grams=record.tare_weight_grams,
                        full_product_weight_grams=record.full_product_weight_grams,
                        installed_at=_as_aware_utc(record.installed_at),
                    )
                    for record in state.inventory_items
                ),
                telemetry_readings=tuple(
                    TelemetryReading(
                        id=record.id,
                        organization_id=record.organization_id,
                        location_id=record.location_id,
                        controller_id=record.controller_id,
                        tray_id=record.tray_id,
                        timestamp=_as_aware_utc(record.timestamp),
                        gross_weight_grams=record.gross_weight_grams,
                        data_source=record.data_source,
                    )
                    for record in state.telemetry_readings
                ),
            )
