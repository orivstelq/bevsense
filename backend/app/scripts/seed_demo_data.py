from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.engine import SessionFactory, get_session_factory
from app.db.models import (
    ControllerRecord,
    InventoryItemRecord,
    LocationRecord,
    OrganizationRecord,
    SensorTrayRecord,
    TelemetryReadingRecord,
)
from app.providers.simulated_telemetry import DEMO_TELEMETRY_SNAPSHOTS


def _add_if_missing(session: Session, record) -> None:
    if session.get(type(record), record.id) is None:
        session.add(record)


def seed_demo_data(session_factory: SessionFactory) -> dict[str, int]:
    with session_factory.begin() as session:
        for snapshot in DEMO_TELEMETRY_SNAPSHOTS:
            _add_if_missing(
                session,
                OrganizationRecord(
                    id=snapshot.organization.id,
                    name=snapshot.organization.name,
                ),
            )
            _add_if_missing(
                session,
                LocationRecord(
                    id=snapshot.location.id,
                    organization_id=snapshot.location.organization_id,
                    name=snapshot.location.name,
                ),
            )

            for controller in snapshot.controllers:
                _add_if_missing(
                    session,
                    ControllerRecord(
                        id=controller.id,
                        organization_id=controller.organization_id,
                        location_id=controller.location_id,
                        name=controller.name,
                        status=controller.status.value,
                        last_seen_at=controller.last_seen_at,
                        firmware_version=controller.firmware_version,
                    ),
                )

            for tray in snapshot.sensor_trays:
                _add_if_missing(
                    session,
                    SensorTrayRecord(
                        id=tray.id,
                        organization_id=tray.organization_id,
                        location_id=tray.location_id,
                        controller_id=tray.controller_id,
                        name=tray.name,
                        family=tray.family.value,
                        status=tray.status.value,
                    ),
                )

            for item in snapshot.inventory_items:
                _add_if_missing(
                    session,
                    InventoryItemRecord(
                        id=item.id,
                        organization_id=item.organization_id,
                        location_id=item.location_id,
                        tray_id=item.tray_id,
                        product_name=item.product_name,
                        container_size_gallons=item.container_size_gallons,
                        tare_weight_grams=item.tare_weight_grams,
                        full_product_weight_grams=item.full_product_weight_grams,
                        installed_at=item.installed_at,
                    ),
                )

            for reading in snapshot.telemetry_readings:
                _add_if_missing(
                    session,
                    TelemetryReadingRecord(
                        id=reading.id,
                        organization_id=reading.organization_id,
                        location_id=reading.location_id,
                        controller_id=reading.controller_id,
                        tray_id=reading.tray_id,
                        timestamp=reading.timestamp,
                        gross_weight_grams=reading.gross_weight_grams,
                        data_source=reading.data_source.value,
                    ),
                )

    with session_factory() as session:
        return {
            "organizations": session.scalar(
                select(func.count()).select_from(OrganizationRecord)
            )
            or 0,
            "locations": session.scalar(
                select(func.count()).select_from(LocationRecord)
            )
            or 0,
            "controllers": session.scalar(
                select(func.count()).select_from(ControllerRecord)
            )
            or 0,
            "sensor_trays": session.scalar(
                select(func.count()).select_from(SensorTrayRecord)
            )
            or 0,
            "inventory_items": session.scalar(
                select(func.count()).select_from(InventoryItemRecord)
            )
            or 0,
            "telemetry_readings": session.scalar(
                select(func.count()).select_from(TelemetryReadingRecord)
            )
            or 0,
        }


def main() -> None:
    counts = seed_demo_data(get_session_factory())
    summary = ", ".join(f"{name}={count}" for name, count in counts.items())
    print(f"Demo data ready: {summary}")


if __name__ == "__main__":
    main()
