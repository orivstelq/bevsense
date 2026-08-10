from pathlib import Path

import pytest
from alembic import command
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError, OperationalError

from app.db.engine import create_database_engine, create_session_factory
from app.db.models import (
    ControllerCredentialRecord,
    ControllerRecord,
    InventoryItemRecord,
    LocationRecord,
    OrganizationRecord,
    SensorTrayRecord,
    TelemetryReadingRecord,
)
from app.dependencies import create_telemetry_service, get_telemetry_service
from app.main import app
from app.providers.database_telemetry import DatabaseTelemetryProvider
from app.scripts.seed_demo_data import seed_demo_data
from app.services.telemetry_service import TelemetryService
from tests.conftest import DatabaseFixture


EXPECTED_TABLES = {
    "alembic_version",
    "controller_credentials",
    "controllers",
    "inventory_items",
    "location_assignments",
    "locations",
    "organization_memberships",
    "organizations",
    "sensor_trays",
    "telemetry_readings",
    "user_profiles",
}


def table_counts(database: DatabaseFixture) -> dict[str, int]:
    models = (
        OrganizationRecord,
        LocationRecord,
        ControllerRecord,
        SensorTrayRecord,
        InventoryItemRecord,
        TelemetryReadingRecord,
    )
    with database.session_factory() as session:
        return {
            model.__tablename__: session.scalar(
                select(func.count()).select_from(model)
            )
            or 0
            for model in models
        }


def test_initial_migration_supports_downgrade_and_upgrade(
    migrated_database: DatabaseFixture,
) -> None:
    assert set(inspect(migrated_database.engine).get_table_names()) == EXPECTED_TABLES
    with migrated_database.engine.connect() as connection:
        assert (
            MigrationContext.configure(connection).get_current_revision()
            == "20260809_0004"
        )

    credential_columns = {
        column["name"]: column
        for column in inspect(migrated_database.engine).get_columns(
            "controller_credentials"
        )
    }
    assert credential_columns["revoked_at"]["nullable"] is True
    assert ControllerCredentialRecord.__table__.c.revoked_at.type.timezone is True

    command.downgrade(migrated_database.alembic_config, "20260809_0002")
    assert "revoked_at" not in {
        column["name"]
        for column in inspect(migrated_database.engine).get_columns(
            "controller_credentials"
        )
    }
    command.downgrade(migrated_database.alembic_config, "20260808_0001")
    assert "controller_credentials" not in inspect(
        migrated_database.engine
    ).get_table_names()
    command.downgrade(migrated_database.alembic_config, "base")
    assert inspect(migrated_database.engine).get_table_names() == [
        "alembic_version"
    ]
    command.upgrade(migrated_database.alembic_config, "head")
    assert set(inspect(migrated_database.engine).get_table_names()) == EXPECTED_TABLES


def test_demo_seed_is_idempotent(seeded_database: DatabaseFixture) -> None:
    expected = {
        "organizations": 1,
        "locations": 2,
        "controllers": 2,
        "sensor_trays": 9,
        "inventory_items": 7,
        "telemetry_readings": 9,
    }

    assert table_counts(seeded_database) == expected
    assert seed_demo_data(seeded_database.session_factory) == expected
    assert table_counts(seeded_database) == expected
    with seeded_database.session_factory() as session:
        assert (
            session.scalar(
                select(func.count()).select_from(ControllerCredentialRecord)
            )
            == 0
        )


@pytest.mark.parametrize(
    ("location_id", "expected_counts"),
    (
        ("demo-main-dining", (1, 6, 5, 6)),
        ("demo-secondary-dining", (1, 3, 2, 3)),
    ),
)
def test_database_provider_returns_persisted_location_snapshots(
    seeded_database: DatabaseFixture,
    location_id: str,
    expected_counts: tuple[int, int, int, int],
) -> None:
    provider = DatabaseTelemetryProvider(seeded_database.session_factory)
    snapshot = provider.get_snapshot("demo-organization", location_id)

    assert snapshot is not None
    assert (
        len(snapshot.controllers),
        len(snapshot.sensor_trays),
        len(snapshot.inventory_items),
        len(snapshot.telemetry_readings),
    ) == expected_counts
    assert snapshot.data_source.value == "simulated"


def test_database_provider_returns_none_for_unknown_scope(
    seeded_database: DatabaseFixture,
) -> None:
    provider = DatabaseTelemetryProvider(seeded_database.session_factory)

    assert provider.get_snapshot("demo-organization", "unknown-location") is None
    assert provider.get_snapshot("wrong-organization", "demo-main-dining") is None


def test_database_provider_keeps_records_location_scoped(
    seeded_database: DatabaseFixture,
) -> None:
    provider = DatabaseTelemetryProvider(seeded_database.session_factory)

    for location_id in ("demo-main-dining", "demo-secondary-dining"):
        snapshot = provider.get_snapshot("demo-organization", location_id)
        assert snapshot is not None
        records = (
            *snapshot.controllers,
            *snapshot.sensor_trays,
            *snapshot.inventory_items,
            *snapshot.telemetry_readings,
        )
        assert all(record.location_id == location_id for record in records)
        assert all(
            record.organization_id == "demo-organization" for record in records
        )


def test_telemetry_history_rows_are_retained(
    seeded_database: DatabaseFixture,
) -> None:
    provider = DatabaseTelemetryProvider(seeded_database.session_factory)
    snapshot = provider.get_snapshot("demo-organization", "demo-main-dining")

    assert snapshot is not None
    tray_readings = [
        reading
        for reading in snapshot.telemetry_readings
        if reading.tray_id == "demo-main-tray-01"
    ]
    assert [reading.id for reading in tray_readings] == [
        "demo-main-reading-01",
        "demo-main-reading-02",
    ]


def test_provider_recreation_reads_persisted_records(
    seeded_database: DatabaseFixture,
) -> None:
    seeded_database.engine.dispose()
    recreated_engine = create_database_engine(seeded_database.url)
    provider = DatabaseTelemetryProvider(create_session_factory(recreated_engine))

    snapshot = provider.get_snapshot("demo-organization", "demo-secondary-dining")

    assert snapshot is not None
    assert len(snapshot.telemetry_readings) == 3
    recreated_engine.dispose()


def test_empty_migrated_database_returns_404(
    migrated_database: DatabaseFixture,
) -> None:
    service = TelemetryService(
        provider=DatabaseTelemetryProvider(migrated_database.session_factory)
    )
    app.dependency_overrides[get_telemetry_service] = lambda: service

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/organizations/demo-organization/locations/"
            "demo-main-dining/snapshot"
        )

    app.dependency_overrides.clear()
    assert response.status_code == 404


def test_unmigrated_database_fails_without_simulated_fallback(
    tmp_path: Path,
) -> None:
    engine = create_database_engine(f"sqlite:///{tmp_path / 'unmigrated.db'}")
    provider = DatabaseTelemetryProvider(create_session_factory(engine))

    with pytest.raises(OperationalError):
        provider.get_snapshot("demo-organization", "demo-main-dining")

    engine.dispose()


def test_foreign_keys_reject_tray_without_controller(
    seeded_database: DatabaseFixture,
) -> None:
    with seeded_database.session_factory() as session:
        session.add(
            SensorTrayRecord(
                id="invalid-tray",
                organization_id="demo-organization",
                location_id="demo-main-dining",
                controller_id="missing-controller",
                name="Invalid tray",
                family="5-gallon",
                status="ready",
            )
        )

        with pytest.raises(IntegrityError):
            session.commit()


def test_explicit_simulated_provider_does_not_require_database() -> None:
    service = create_telemetry_service("simulated")

    snapshot = service.get_snapshot("demo-organization", "demo-main-dining")

    assert len(snapshot.controllers) == 1
    assert len(snapshot.sensor_trays) == 6


def test_invalid_backend_provider_and_database_url_fail_clearly() -> None:
    with pytest.raises(ValueError, match="either database or simulated"):
        create_telemetry_service("unknown")

    with pytest.raises(ValueError, match="configured database URL"):
        create_database_engine("not-a-database-url")
