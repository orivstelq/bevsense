from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, status

from app.models.telemetry import LocationTelemetrySnapshot
from app.providers.simulated_telemetry import SimulatedTelemetryProvider
from app.services.telemetry_service import SnapshotNotFoundError, TelemetryService


router = APIRouter(tags=["Telemetry"])
telemetry_service = TelemetryService(provider=SimulatedTelemetryProvider())


@router.get(
    "/organizations/{organization_id}/locations/{location_id}/snapshot",
    response_model=LocationTelemetrySnapshot,
    summary="Get a location telemetry snapshot",
    description=(
        "Returns one deterministic, location-scoped telemetry payload. "
        "Path scope is not authorization."
    ),
)
def get_location_snapshot(
    organization_id: Annotated[str, Path(min_length=1)],
    location_id: Annotated[str, Path(min_length=1)],
) -> LocationTelemetrySnapshot:
    try:
        return telemetry_service.get_snapshot(organization_id, location_id)
    except SnapshotNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from None
