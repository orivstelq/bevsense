from enum import Enum
from typing import Annotated, Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    NonNegativeFloat,
    PositiveFloat,
    StringConstraints,
    model_validator,
)


TELEMETRY_SCHEMA_VERSION = "1.0"
NonEmptyString = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]


def _to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ContractModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        allow_inf_nan=False,
        extra="forbid",
        frozen=True,
        populate_by_name=True,
    )


class ControllerStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class SensorTrayStatus(str, Enum):
    READY = "ready"
    OFFLINE = "offline"
    FAULT = "fault"
    UNKNOWN = "unknown"


class SensorTrayFamily(str, Enum):
    COMPACT_25_GALLON = "2.5-gallon"
    STANDARD_5_GALLON = "5-gallon"


class TelemetryDataSource(str, Enum):
    SIMULATED = "simulated"
    LIVE = "live"


class Organization(ContractModel):
    id: NonEmptyString
    name: NonEmptyString


class Location(ContractModel):
    id: NonEmptyString
    organization_id: NonEmptyString
    name: NonEmptyString


class LocationScopedModel(ContractModel):
    organization_id: NonEmptyString
    location_id: NonEmptyString


class Controller(LocationScopedModel):
    id: NonEmptyString
    name: NonEmptyString
    status: ControllerStatus
    last_seen_at: AwareDatetime | None
    firmware_version: NonEmptyString | None = Field(
        default=None,
        exclude_if=lambda value: value is None,
    )


class SensorTray(LocationScopedModel):
    id: NonEmptyString
    controller_id: NonEmptyString
    name: NonEmptyString
    family: SensorTrayFamily
    status: SensorTrayStatus


class InventoryItem(LocationScopedModel):
    id: NonEmptyString
    tray_id: NonEmptyString
    product_name: NonEmptyString
    container_size_gallons: Literal[2.5, 5.0]
    tare_weight_grams: NonNegativeFloat
    full_product_weight_grams: PositiveFloat
    installed_at: AwareDatetime


class TelemetryReading(LocationScopedModel):
    id: NonEmptyString
    controller_id: NonEmptyString
    tray_id: NonEmptyString
    timestamp: AwareDatetime
    gross_weight_grams: NonNegativeFloat
    data_source: TelemetryDataSource


class LocationTelemetrySnapshot(LocationScopedModel):
    schema_version: Literal["1.0"]
    organization: Organization
    location: Location
    data_source: TelemetryDataSource
    controllers: tuple[Controller, ...]
    sensor_trays: tuple[SensorTray, ...]
    inventory_items: tuple[InventoryItem, ...]
    telemetry_readings: tuple[TelemetryReading, ...]

    @model_validator(mode="after")
    def validate_location_scope(self) -> "LocationTelemetrySnapshot":
        scope = (self.organization_id, self.location_id)
        if self.organization.id != self.organization_id:
            raise ValueError("Snapshot organization does not match organizationId.")
        if (
            self.location.id != self.location_id
            or self.location.organization_id != self.organization_id
        ):
            raise ValueError("Snapshot location does not match its location scope.")

        scoped_records = (
            *self.controllers,
            *self.sensor_trays,
            *self.inventory_items,
            *self.telemetry_readings,
        )
        if any(
            (record.organization_id, record.location_id) != scope
            for record in scoped_records
        ):
            raise ValueError("Snapshot contains a record from another location scope.")

        controllers_by_id = {
            controller.id: controller for controller in self.controllers
        }
        trays_by_id = {tray.id: tray for tray in self.sensor_trays}

        for tray in self.sensor_trays:
            if tray.controller_id not in controllers_by_id:
                raise ValueError("Sensor tray references an unknown controller.")

        for item in self.inventory_items:
            tray = trays_by_id.get(item.tray_id)
            if tray is None:
                raise ValueError("Inventory item references an unknown sensor tray.")
            expected_family = (
                SensorTrayFamily.COMPACT_25_GALLON
                if item.container_size_gallons == 2.5
                else SensorTrayFamily.STANDARD_5_GALLON
            )
            if tray.family != expected_family:
                raise ValueError(
                    "Inventory container size does not match its tray family."
                )

        for reading in self.telemetry_readings:
            tray = trays_by_id.get(reading.tray_id)
            if tray is None or reading.controller_id not in controllers_by_id:
                raise ValueError("Telemetry reading references an unknown device.")
            if tray.controller_id != reading.controller_id:
                raise ValueError("Telemetry reading controller does not own its tray.")
            if reading.data_source != self.data_source:
                raise ValueError(
                    "Telemetry reading dataSource differs from its snapshot."
                )

        return self
