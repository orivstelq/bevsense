from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.dependencies import get_telemetry_service
from app.api.human_auth import authorize_snapshot_read
from app.models.telemetry import LocationTelemetrySnapshot
from app.services.telemetry_service import SnapshotNotFoundError, TelemetryService


router = APIRouter(tags=["Telemetry"])


@router.get(
    "/organizations/{organization_id}/locations/{location_id}/snapshot",
    response_model=LocationTelemetrySnapshot,
    summary="Get a location telemetry snapshot",
    description=(
        "Returns one location-scoped telemetry payload. When human authentication "
        "is enabled, access is verified against server-side memberships and "
        "location assignments."
    ),
)
def get_location_snapshot(
    organization_id: Annotated[str, Path(min_length=1)],
    location_id: Annotated[str, Path(min_length=1)],
    telemetry_service: Annotated[
        TelemetryService,
        Depends(get_telemetry_service),
    ],
    _access: Annotated[object | None, Depends(authorize_snapshot_read)],
) -> LocationTelemetrySnapshot:
    try:
        return telemetry_service.get_snapshot(organization_id, location_id)
    except SnapshotNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from None
