from dataclasses import dataclass
from typing import Protocol

from app.models.telemetry import LocationTelemetrySnapshot, TelemetryDataSource


class TelemetryProvider(Protocol):
    data_source: TelemetryDataSource

    def get_snapshot(
        self,
        organization_id: str,
        location_id: str,
    ) -> LocationTelemetrySnapshot | None: ...


class SnapshotNotFoundError(LookupError):
    pass


@dataclass(frozen=True, slots=True)
class TelemetryService:
    provider: TelemetryProvider

    def get_snapshot(
        self,
        organization_id: str,
        location_id: str,
    ) -> LocationTelemetrySnapshot:
        snapshot = self.provider.get_snapshot(organization_id, location_id)
        if snapshot is None:
            raise SnapshotNotFoundError(
                "No telemetry snapshot exists for the requested organization "
                "and location."
            )
        if (
            snapshot.organization_id != organization_id
            or snapshot.location_id != location_id
        ):
            raise RuntimeError(
                "Telemetry provider returned data outside the requested scope."
            )

        return snapshot
