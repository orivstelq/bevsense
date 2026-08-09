from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Response,
    status,
)

from app.dependencies import get_telemetry_ingestion_service
from app.models.ingestion import (
    TelemetryIngestionReceipt,
    TelemetryIngestionRequest,
)
from app.services.telemetry_ingestion_service import (
    TelemetryIngestionDisabledError,
    TelemetryIngestionScopeNotFoundError,
    TelemetryIngestionService,
    TelemetryIngestionUnavailableError,
    TelemetryReadingConflictError,
)


router = APIRouter(tags=["Telemetry ingestion"])


@router.put(
    "/organizations/{organization_id}/locations/{location_id}"
    "/controllers/{controller_id}/readings/{reading_id}",
    response_model=TelemetryIngestionReceipt,
    status_code=status.HTTP_201_CREATED,
    responses={
        200: {"description": "The identical reading already exists."},
        404: {"description": "The requested device scope does not exist."},
        409: {"description": "The reading ID has conflicting immutable data."},
        503: {"description": "Development telemetry ingestion is disabled."},
    },
    summary="Ingest one simulated controller reading",
    description=(
        "Development-only, append-only simulated telemetry ingestion. "
        "Disabled by default and not protected by device authentication."
    ),
)
def ingest_telemetry_reading(
    organization_id: Annotated[str, Path(min_length=1)],
    location_id: Annotated[str, Path(min_length=1)],
    controller_id: Annotated[str, Path(min_length=1)],
    reading_id: Annotated[str, Path(min_length=1)],
    request: TelemetryIngestionRequest,
    response: Response,
    service: Annotated[
        TelemetryIngestionService,
        Depends(get_telemetry_ingestion_service),
    ],
) -> TelemetryIngestionReceipt:
    try:
        result = service.ingest(
            organization_id=organization_id,
            location_id=location_id,
            controller_id=controller_id,
            reading_id=reading_id,
            tray_id=request.tray_id,
            timestamp=request.timestamp,
            gross_weight_grams=request.gross_weight_grams,
        )
    except TelemetryIngestionScopeNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from None
    except TelemetryReadingConflictError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from None
    except (
        TelemetryIngestionDisabledError,
        TelemetryIngestionUnavailableError,
    ) as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from None

    if result.result == "duplicate":
        response.status_code = status.HTTP_200_OK

    return TelemetryIngestionReceipt(
        reading_id=result.reading_id,
        organization_id=result.organization_id,
        location_id=result.location_id,
        controller_id=result.controller_id,
        tray_id=result.tray_id,
        timestamp=result.timestamp,
        gross_weight_grams=result.gross_weight_grams,
        data_source=result.data_source,
        result=result.result,
    )
