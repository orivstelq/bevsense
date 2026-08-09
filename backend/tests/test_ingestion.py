from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import get_ingestion_enabled
from app.db.engine import create_database_engine, create_session_factory
from app.db.ingestion_repository import TelemetryIngestionRepository
from app.db.models import TelemetryReadingRecord
from app.dependencies import (
    create_telemetry_ingestion_service,
    get_telemetry_ingestion_service,
)
from app.main import app
from app.providers.database_telemetry import DatabaseTelemetryProvider
from app.services.telemetry_ingestion_service import (
    TelemetryIngestionService,
    TelemetryIngestionUnavailableError,
)
from tests.conftest import DatabaseFixture


INGESTION_URL = (
    "/api/v1/organizations/demo-organization/locations/demo-main-dining"
    "/controllers/demo-main-controller-01/readings/phase2f-reading-001"
)
SNAPSHOT_URL = (
    "/api/v1/organizations/demo-organization/locations/demo-main-dining/snapshot"
)
VALID_BODY = {
    "trayId": "demo-main-tray-01",
    "timestamp": "2026-08-09T05:00:00Z",
    "grossWeightGrams": 4650.0,
}


def reading_count(database: DatabaseFixture) -> int:
    with database.session_factory() as session:
        return (
            session.scalar(
                select(func.count()).select_from(TelemetryReadingRecord)
            )
            or 0
        )


def test_valid_reading_is_created_and_server_assigns_simulated_source(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    response = ingestion_client.put(INGESTION_URL, json=VALID_BODY)

    assert response.status_code == 201
    assert response.json() == {
        "readingId": "phase2f-reading-001",
        "organizationId": "demo-organization",
        "locationId": "demo-main-dining",
        "controllerId": "demo-main-controller-01",
        "trayId": "demo-main-tray-01",
        "timestamp": "2026-08-09T05:00:00Z",
        "grossWeightGrams": 4650.0,
        "dataSource": "simulated",
        "result": "created",
    }
    with seeded_database.session_factory() as session:
        reading = session.get(TelemetryReadingRecord, "phase2f-reading-001")
        assert reading is not None
        assert reading.organization_id == "demo-organization"
        assert reading.location_id == "demo-main-dining"
        assert reading.controller_id == "demo-main-controller-01"
        assert reading.tray_id == "demo-main-tray-01"
        assert reading.timestamp == datetime(2026, 8, 9, 5, 0)
        assert reading.gross_weight_grams == 4650.0
        assert reading.data_source == "simulated"


def test_equivalent_timestamp_retry_is_idempotent(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    offset_body = {**VALID_BODY, "timestamp": "2026-08-09T00:00:00-05:00"}

    first = ingestion_client.put(INGESTION_URL, json=offset_body)
    retry = ingestion_client.put(INGESTION_URL, json=VALID_BODY)

    assert first.status_code == 201
    assert retry.status_code == 200
    assert retry.json()["result"] == "duplicate"
    assert reading_count(seeded_database) == 10


def test_conflicting_reading_id_returns_409_without_mutation(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    assert ingestion_client.put(INGESTION_URL, json=VALID_BODY).status_code == 201

    conflict = ingestion_client.put(
        INGESTION_URL,
        json={**VALID_BODY, "grossWeightGrams": 9999.0},
    )

    assert conflict.status_code == 409
    assert reading_count(seeded_database) == 10
    with seeded_database.session_factory() as session:
        reading = session.get(TelemetryReadingRecord, "phase2f-reading-001")
        assert reading is not None
        assert reading.gross_weight_grams == 4650.0


@pytest.mark.parametrize(
    ("url", "body"),
    (
        (
            INGESTION_URL.replace("demo-organization", "unknown-organization"),
            VALID_BODY,
        ),
        (
            INGESTION_URL.replace("demo-main-dining", "unknown-location"),
            VALID_BODY,
        ),
        (
            INGESTION_URL.replace(
                "demo-main-controller-01", "unknown-controller"
            ),
            VALID_BODY,
        ),
        (INGESTION_URL, {**VALID_BODY, "trayId": "unknown-tray"}),
        (
            INGESTION_URL,
            {**VALID_BODY, "trayId": "demo-secondary-tray-01"},
        ),
    ),
)
def test_unknown_or_cross_location_scope_returns_404(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
    url: str,
    body: dict[str, object],
) -> None:
    response = ingestion_client.put(url, json=body)

    assert response.status_code == 404
    assert response.json() == {
        "detail": "The requested controller and tray scope was not found."
    }
    assert reading_count(seeded_database) == 9


@pytest.mark.parametrize(
    "body",
    (
        {**VALID_BODY, "grossWeightGrams": -1},
        {**VALID_BODY, "grossWeightGrams": "NaN"},
        {**VALID_BODY, "timestamp": "2026-08-09T05:00:00"},
        {key: value for key, value in VALID_BODY.items() if key != "trayId"},
        {key: value for key, value in VALID_BODY.items() if key != "timestamp"},
        {
            key: value
            for key, value in VALID_BODY.items()
            if key != "grossWeightGrams"
        },
        {**VALID_BODY, "dataSource": "live"},
    ),
)
def test_invalid_request_returns_422_without_writing(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
    body: dict[str, object],
) -> None:
    response = ingestion_client.put(INGESTION_URL, json=body)

    assert response.status_code == 422
    assert reading_count(seeded_database) == 9


@pytest.mark.parametrize("non_finite_value", ("NaN", "Infinity", "-Infinity"))
def test_non_finite_json_number_returns_422_without_writing(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
    non_finite_value: str,
) -> None:
    body = (
        '{"trayId":"demo-main-tray-01",'
        '"timestamp":"2026-08-09T05:00:00Z",'
        f'"grossWeightGrams":{non_finite_value}'
        "}"
    )

    response = ingestion_client.put(
        INGESTION_URL,
        content=body,
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422
    assert reading_count(seeded_database) == 9


def test_disabled_ingestion_returns_503_without_affecting_reads(
    client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    disabled_service = TelemetryIngestionService(
        session_factory=seeded_database.session_factory,
        enabled=False,
    )
    app.dependency_overrides[get_telemetry_ingestion_service] = (
        lambda: disabled_service
    )

    response = client.put(INGESTION_URL, json=VALID_BODY)

    assert response.status_code == 503
    assert client.get("/api/v1/health").status_code == 200
    assert client.get(SNAPSHOT_URL).status_code == 200
    assert reading_count(seeded_database) == 9


def test_multiple_readings_preserve_history_and_appear_in_snapshot(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    first = ingestion_client.put(INGESTION_URL, json=VALID_BODY)
    second = ingestion_client.put(
        INGESTION_URL.replace("phase2f-reading-001", "phase2f-reading-002"),
        json={**VALID_BODY, "timestamp": "2026-08-09T05:10:00Z"},
    )
    snapshot = ingestion_client.get(SNAPSHOT_URL).json()

    assert first.status_code == 201
    assert second.status_code == 201
    assert reading_count(seeded_database) == 11
    assert snapshot["schemaVersion"] == "1.0"
    assert snapshot["dataSource"] == "simulated"
    reading_ids = {reading["id"] for reading in snapshot["telemetryReadings"]}
    assert {
        "demo-main-reading-01",
        "demo-main-reading-02",
        "phase2f-reading-001",
        "phase2f-reading-002",
    } <= reading_ids


def test_out_of_order_reading_is_retained_without_becoming_latest(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    response = ingestion_client.put(
        INGESTION_URL,
        json={**VALID_BODY, "timestamp": "2026-01-15T11:00:00Z"},
    )
    snapshot = ingestion_client.get(SNAPSHOT_URL).json()
    tray_readings = [
        reading
        for reading in snapshot["telemetryReadings"]
        if reading["trayId"] == "demo-main-tray-01"
    ]

    assert response.status_code == 201
    assert reading_count(seeded_database) == 10
    assert any(
        reading["id"] == "phase2f-reading-001" for reading in tray_readings
    )
    assert tray_readings[-1]["id"] == "demo-main-reading-02"


def test_ingested_reading_survives_engine_and_provider_recreation(
    seeded_database: DatabaseFixture,
) -> None:
    service = TelemetryIngestionService(
        session_factory=seeded_database.session_factory,
        enabled=True,
    )
    service.ingest(
        organization_id="demo-organization",
        location_id="demo-main-dining",
        controller_id="demo-main-controller-01",
        reading_id="phase2f-reading-001",
        tray_id="demo-main-tray-01",
        timestamp=datetime(2026, 8, 9, 5, 0, tzinfo=UTC),
        gross_weight_grams=4650.0,
    )
    seeded_database.engine.dispose()

    recreated_engine = create_database_engine(seeded_database.url)
    provider = DatabaseTelemetryProvider(create_session_factory(recreated_engine))
    snapshot = provider.get_snapshot("demo-organization", "demo-main-dining")

    assert snapshot is not None
    assert any(
        reading.id == "phase2f-reading-001"
        for reading in snapshot.telemetry_readings
    )
    recreated_engine.dispose()


def test_transaction_rolls_back_when_repository_write_fails(
    seeded_database: DatabaseFixture,
) -> None:
    class FailingRepository(TelemetryIngestionRepository):
        def add_reading(self, session, reading) -> None:
            super().add_reading(session, reading)
            raise RuntimeError("forced failure")

    service = TelemetryIngestionService(
        session_factory=seeded_database.session_factory,
        enabled=True,
        repository=FailingRepository(),
    )

    with pytest.raises(RuntimeError, match="forced failure"):
        service.ingest(
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="demo-main-controller-01",
            reading_id="phase2f-reading-001",
            tray_id="demo-main-tray-01",
            timestamp=datetime(2026, 8, 9, 5, 0, tzinfo=UTC),
            gross_weight_grams=4650.0,
        )

    assert reading_count(seeded_database) == 9


def test_simulated_read_provider_rejects_database_ingestion() -> None:
    service = create_telemetry_ingestion_service(
        enabled=True,
        provider_name="simulated",
    )

    with pytest.raises(TelemetryIngestionUnavailableError):
        service.ingest(
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="demo-main-controller-01",
            reading_id="phase2f-reading-001",
            tray_id="demo-main-tray-01",
            timestamp=datetime(2026, 8, 9, 5, 0, tzinfo=UTC),
            gross_weight_grams=4650.0,
        )


def test_reading_id_is_globally_unique_across_locations(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    assert ingestion_client.put(INGESTION_URL, json=VALID_BODY).status_code == 201
    secondary_url = (
        "/api/v1/organizations/demo-organization/locations/demo-secondary-dining"
        "/controllers/demo-secondary-controller-01/readings/phase2f-reading-001"
    )

    response = ingestion_client.put(
        secondary_url,
        json={
            "trayId": "demo-secondary-tray-01",
            "timestamp": "2026-08-09T05:00:00Z",
            "grossWeightGrams": 4650.0,
        },
    )

    assert response.status_code == 409
    assert reading_count(seeded_database) == 10


def test_unmigrated_database_fails_without_fallback(tmp_path: Path) -> None:
    engine = create_database_engine(f"sqlite:///{tmp_path / 'unmigrated.db'}")
    service = TelemetryIngestionService(
        session_factory=create_session_factory(engine),
        enabled=True,
    )
    app.dependency_overrides[get_telemetry_ingestion_service] = lambda: service

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.put(INGESTION_URL, json=VALID_BODY)

    app.dependency_overrides.clear()
    engine.dispose()
    assert response.status_code == 500


def test_ingestion_boolean_configuration_is_explicit(monkeypatch) -> None:
    monkeypatch.setenv("BIB_INGESTION_ENABLED", "TRUE")
    assert get_ingestion_enabled() is True

    monkeypatch.setenv("BIB_INGESTION_ENABLED", "false")
    assert get_ingestion_enabled() is False

    monkeypatch.setenv("BIB_INGESTION_ENABLED", "yes")
    with pytest.raises(ValueError, match="either true or false"):
        get_ingestion_enabled()
