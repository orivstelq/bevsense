from datetime import datetime
from math import isfinite
from typing import Annotated, Literal

from pydantic import AwareDatetime, BeforeValidator, Field

from app.models.telemetry import (
    ContractModel,
    NonEmptyString,
    TelemetryDataSource,
)


def _make_non_finite_input_json_safe(value: object) -> object:
    if isinstance(value, float) and not isfinite(value):
        return "non-finite number"
    return value


NonNegativeFiniteFloat = Annotated[
    float,
    BeforeValidator(_make_non_finite_input_json_safe),
    Field(strict=True, ge=0, allow_inf_nan=False),
]


class TelemetryIngestionRequest(ContractModel):
    tray_id: NonEmptyString
    timestamp: AwareDatetime
    gross_weight_grams: NonNegativeFiniteFloat


class TelemetryIngestionReceipt(ContractModel):
    reading_id: NonEmptyString
    organization_id: NonEmptyString
    location_id: NonEmptyString
    controller_id: NonEmptyString
    tray_id: NonEmptyString
    timestamp: AwareDatetime
    gross_weight_grams: NonNegativeFiniteFloat
    data_source: TelemetryDataSource
    result: Literal["created", "duplicate"]
