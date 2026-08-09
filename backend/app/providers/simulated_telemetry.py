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


DEMO_ORGANIZATION = Organization(
    id="demo-organization",
    name="Demo Organization",
)

MAIN_DINING = Location(
    id="demo-main-dining",
    organization_id=DEMO_ORGANIZATION.id,
    name="Main Dining",
)

SECONDARY_DINING = Location(
    id="demo-secondary-dining",
    organization_id=DEMO_ORGANIZATION.id,
    name="Secondary Dining",
)


def _main_dining_snapshot() -> LocationTelemetrySnapshot:
    scope = {
        "organization_id": DEMO_ORGANIZATION.id,
        "location_id": MAIN_DINING.id,
    }
    controller_id = "demo-main-controller-01"
    tray_ids = tuple(f"demo-main-tray-{position:02}" for position in range(1, 7))

    controllers = (
        Controller(
            **scope,
            id=controller_id,
            name="Main Dining Demo Controller",
            status="online",
            last_seen_at="2026-01-15T12:10:00.000Z",
        ),
    )
    sensor_trays = tuple(
        SensorTray(
            **scope,
            id=tray_id,
            controller_id=controller_id,
            name=f"Rack A / Position {position}",
            family=family,
            status="ready",
        )
        for position, (tray_id, family) in enumerate(
            zip(
                tray_ids,
                (
                    "5-gallon",
                    "5-gallon",
                    "2.5-gallon",
                    "2.5-gallon",
                    "5-gallon",
                    "2.5-gallon",
                ),
                strict=True,
            ),
            start=1,
        )
    )
    inventory_items = (
        InventoryItem(
            **scope,
            id="demo-main-inventory-01",
            tray_id=tray_ids[0],
            product_name="Demo Cola Syrup",
            container_size_gallons=5,
            tare_weight_grams=900,
            full_product_weight_grams=25_000,
            installed_at="2026-01-15T08:00:00.000Z",
        ),
        InventoryItem(
            **scope,
            id="demo-main-inventory-02",
            tray_id=tray_ids[1],
            product_name="Demo Diet Cola Syrup",
            container_size_gallons=5,
            tare_weight_grams=900,
            full_product_weight_grams=25_000,
            installed_at="2026-01-15T08:05:00.000Z",
        ),
        InventoryItem(
            **scope,
            id="demo-main-inventory-03",
            tray_id=tray_ids[2],
            product_name="Demo Lemon-Lime Syrup",
            container_size_gallons=2.5,
            tare_weight_grams=600,
            full_product_weight_grams=12_500,
            installed_at="2026-01-15T08:10:00.000Z",
        ),
        InventoryItem(
            **scope,
            id="demo-main-inventory-04",
            tray_id=tray_ids[3],
            product_name="Demo Orange Syrup",
            container_size_gallons=2.5,
            tare_weight_grams=600,
            full_product_weight_grams=12_500,
            installed_at="2026-01-15T08:15:00.000Z",
        ),
        InventoryItem(
            **scope,
            id="demo-main-inventory-05",
            tray_id=tray_ids[4],
            product_name="Demo Root Beer Syrup",
            container_size_gallons=5,
            tare_weight_grams=900,
            full_product_weight_grams=25_000,
            installed_at="2026-01-15T08:20:00.000Z",
        ),
    )
    telemetry_readings = (
        TelemetryReading(
            **scope,
            id="demo-main-reading-01",
            controller_id=controller_id,
            tray_id=tray_ids[0],
            timestamp="2026-01-15T12:00:00.000Z",
            gross_weight_grams=19_650,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-main-reading-02",
            controller_id=controller_id,
            tray_id=tray_ids[0],
            timestamp="2026-01-15T12:10:00.000Z",
            gross_weight_grams=23_400,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-main-reading-03",
            controller_id=controller_id,
            tray_id=tray_ids[1],
            timestamp="2026-01-15T12:10:00.000Z",
            gross_weight_grams=13_400,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-main-reading-04",
            controller_id=controller_id,
            tray_id=tray_ids[2],
            timestamp="2026-01-15T12:10:00.000Z",
            gross_weight_grams=3_100,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-main-reading-05",
            controller_id=controller_id,
            tray_id=tray_ids[3],
            timestamp="2026-01-15T12:10:00.000Z",
            gross_weight_grams=13_100,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-main-reading-06",
            controller_id=controller_id,
            tray_id=tray_ids[4],
            timestamp="2026-01-15T12:10:00.000Z",
            gross_weight_grams=5_900,
            data_source="simulated",
        ),
    )

    return LocationTelemetrySnapshot(
        **scope,
        schema_version=TELEMETRY_SCHEMA_VERSION,
        organization=DEMO_ORGANIZATION,
        location=MAIN_DINING,
        data_source="simulated",
        controllers=controllers,
        sensor_trays=sensor_trays,
        inventory_items=inventory_items,
        telemetry_readings=telemetry_readings,
    )


def _secondary_dining_snapshot() -> LocationTelemetrySnapshot:
    scope = {
        "organization_id": DEMO_ORGANIZATION.id,
        "location_id": SECONDARY_DINING.id,
    }
    controller_id = "demo-secondary-controller-01"
    tray_ids = tuple(
        f"demo-secondary-tray-{position:02}" for position in range(1, 4)
    )

    controllers = (
        Controller(
            **scope,
            id=controller_id,
            name="Secondary Dining Demo Controller",
            status="online",
            last_seen_at="2026-01-15T12:05:00.000Z",
        ),
    )
    sensor_trays = tuple(
        SensorTray(
            **scope,
            id=tray_id,
            controller_id=controller_id,
            name=f"Rack A / Position {position}",
            family=family,
            status="ready",
        )
        for position, (tray_id, family) in enumerate(
            zip(
                tray_ids,
                ("2.5-gallon", "5-gallon", "5-gallon"),
                strict=True,
            ),
            start=1,
        )
    )
    inventory_items = (
        InventoryItem(
            **scope,
            id="demo-secondary-inventory-01",
            tray_id=tray_ids[0],
            product_name="Demo Cola Syrup",
            container_size_gallons=2.5,
            tare_weight_grams=600,
            full_product_weight_grams=12_500,
            installed_at="2026-01-15T09:00:00.000Z",
        ),
        InventoryItem(
            **scope,
            id="demo-secondary-inventory-02",
            tray_id=tray_ids[1],
            product_name="Demo Lemon-Lime Syrup",
            container_size_gallons=5,
            tare_weight_grams=900,
            full_product_weight_grams=25_000,
            installed_at="2026-01-15T09:05:00.000Z",
        ),
    )
    telemetry_readings = (
        TelemetryReading(
            **scope,
            id="demo-secondary-reading-01",
            controller_id=controller_id,
            tray_id=tray_ids[0],
            timestamp="2026-01-15T11:55:00.000Z",
            gross_weight_grams=10_600,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-secondary-reading-02",
            controller_id=controller_id,
            tray_id=tray_ids[0],
            timestamp="2026-01-15T12:05:00.000Z",
            gross_weight_grams=6_850,
            data_source="simulated",
        ),
        TelemetryReading(
            **scope,
            id="demo-secondary-reading-03",
            controller_id=controller_id,
            tray_id=tray_ids[1],
            timestamp="2026-01-15T12:05:00.000Z",
            gross_weight_grams=23_400,
            data_source="simulated",
        ),
    )

    return LocationTelemetrySnapshot(
        **scope,
        schema_version=TELEMETRY_SCHEMA_VERSION,
        organization=DEMO_ORGANIZATION,
        location=SECONDARY_DINING,
        data_source="simulated",
        controllers=controllers,
        sensor_trays=sensor_trays,
        inventory_items=inventory_items,
        telemetry_readings=telemetry_readings,
    )


_SNAPSHOTS = {
    (DEMO_ORGANIZATION.id, MAIN_DINING.id): _main_dining_snapshot(),
    (DEMO_ORGANIZATION.id, SECONDARY_DINING.id): _secondary_dining_snapshot(),
}


class SimulatedTelemetryProvider:
    data_source = TelemetryDataSource.SIMULATED

    def get_snapshot(
        self,
        organization_id: str,
        location_id: str,
    ) -> LocationTelemetrySnapshot | None:
        return _SNAPSHOTS.get((organization_id, location_id))
