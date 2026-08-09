from functools import lru_cache

from app.core.config import settings
from app.db.engine import SessionFactory, get_session_factory
from app.providers.database_telemetry import DatabaseTelemetryProvider
from app.providers.simulated_telemetry import SimulatedTelemetryProvider
from app.services.telemetry_ingestion_service import TelemetryIngestionService
from app.services.telemetry_service import TelemetryService


def create_telemetry_service(
    provider_name: str,
    session_factory: SessionFactory | None = None,
) -> TelemetryService:
    if provider_name == "database":
        if session_factory is None:
            raise ValueError("Database provider requires a session factory.")
        return TelemetryService(
            provider=DatabaseTelemetryProvider(session_factory)
        )
    if provider_name == "simulated":
        return TelemetryService(provider=SimulatedTelemetryProvider())

    raise ValueError(
        "BIB_BACKEND_TELEMETRY_PROVIDER must be either database or simulated."
    )


def create_telemetry_ingestion_service(
    *,
    enabled: bool,
    provider_name: str,
    session_factory: SessionFactory | None = None,
) -> TelemetryIngestionService:
    return TelemetryIngestionService(
        session_factory=session_factory if provider_name == "database" else None,
        enabled=enabled,
    )


@lru_cache
def get_telemetry_service() -> TelemetryService:
    provider_name = settings.backend_telemetry_provider
    session_factory = (
        get_session_factory() if provider_name == "database" else None
    )
    return create_telemetry_service(provider_name, session_factory)


@lru_cache
def get_telemetry_ingestion_service() -> TelemetryIngestionService:
    provider_name = settings.backend_telemetry_provider
    session_factory = (
        get_session_factory() if provider_name == "database" else None
    )
    return create_telemetry_ingestion_service(
        enabled=settings.ingestion_enabled,
        provider_name=provider_name,
        session_factory=session_factory,
    )
