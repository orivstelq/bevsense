from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    ControllerRecord,
    LocationRecord,
    SensorTrayRecord,
    TelemetryReadingRecord,
)


class TelemetryIngestionRepository:
    def scope_exists(
        self,
        session: Session,
        organization_id: str,
        location_id: str,
        controller_id: str,
        tray_id: str,
    ) -> bool:
        location_exists = session.scalar(
            select(LocationRecord.id).where(
                LocationRecord.id == location_id,
                LocationRecord.organization_id == organization_id,
            )
        )
        if location_exists is None:
            return False

        controller_exists = session.scalar(
            select(ControllerRecord.id).where(
                ControllerRecord.id == controller_id,
                ControllerRecord.organization_id == organization_id,
                ControllerRecord.location_id == location_id,
            )
        )
        if controller_exists is None:
            return False

        return (
            session.scalar(
                select(SensorTrayRecord.id).where(
                    SensorTrayRecord.id == tray_id,
                    SensorTrayRecord.organization_id == organization_id,
                    SensorTrayRecord.location_id == location_id,
                    SensorTrayRecord.controller_id == controller_id,
                )
            )
            is not None
        )

    def get_reading(
        self,
        session: Session,
        reading_id: str,
    ) -> TelemetryReadingRecord | None:
        return session.get(TelemetryReadingRecord, reading_id)

    def add_reading(
        self,
        session: Session,
        reading: TelemetryReadingRecord,
    ) -> None:
        session.add(reading)
