from dataclasses import dataclass
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.db.engine import (
    SessionFactory,
    create_database_engine,
    create_session_factory,
)
from app.dependencies import get_telemetry_service
from app.main import app
from app.providers.database_telemetry import DatabaseTelemetryProvider
from app.scripts.seed_demo_data import seed_demo_data
from app.services.telemetry_service import TelemetryService


BACKEND_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True, slots=True)
class DatabaseFixture:
    url: str
    engine: Engine
    session_factory: SessionFactory
    alembic_config: Config


def create_alembic_config(database_url: str) -> Config:
    config = Config(BACKEND_ROOT / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.attributes["database_url"] = database_url
    return config


@pytest.fixture
def migrated_database(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'test.db'}"
    alembic_config = create_alembic_config(database_url)
    command.upgrade(alembic_config, "head")
    engine = create_database_engine(database_url)
    database = DatabaseFixture(
        url=database_url,
        engine=engine,
        session_factory=create_session_factory(engine),
        alembic_config=alembic_config,
    )

    yield database

    engine.dispose()


@pytest.fixture
def seeded_database(migrated_database: DatabaseFixture) -> DatabaseFixture:
    seed_demo_data(migrated_database.session_factory)
    return migrated_database


@pytest.fixture
def client(seeded_database: DatabaseFixture):
    service = TelemetryService(
        provider=DatabaseTelemetryProvider(seeded_database.session_factory)
    )
    app.dependency_overrides[get_telemetry_service] = lambda: service

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
