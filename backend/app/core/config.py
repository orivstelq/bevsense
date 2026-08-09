from dataclasses import dataclass, field
from os import environ


DEFAULT_CORS_ORIGINS = ("http://localhost:3000",)
DEFAULT_DATABASE_URL = "sqlite:///./bib-platform-dev.db"
DEFAULT_BACKEND_TELEMETRY_PROVIDER = "database"
DEFAULT_INGESTION_ENABLED = False


def _load_cors_origins() -> tuple[str, ...]:
    configured_origins = environ.get("BIB_CORS_ORIGINS")
    if configured_origins is None:
        return DEFAULT_CORS_ORIGINS

    return tuple(
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    )


def get_database_url() -> str:
    database_url = environ.get("BIB_DATABASE_URL", DEFAULT_DATABASE_URL).strip()
    if not database_url:
        raise ValueError("BIB_DATABASE_URL must not be empty.")
    return database_url


def get_backend_telemetry_provider() -> str:
    provider = environ.get(
        "BIB_BACKEND_TELEMETRY_PROVIDER",
        DEFAULT_BACKEND_TELEMETRY_PROVIDER,
    )
    return provider.strip()


def get_ingestion_enabled() -> bool:
    default_value = str(DEFAULT_INGESTION_ENABLED).lower()
    configured_value = environ.get(
        "BIB_INGESTION_ENABLED",
        default_value,
    ).strip().lower()
    if configured_value == "true":
        return True
    if configured_value == "false":
        return False
    raise ValueError("BIB_INGESTION_ENABLED must be either true or false.")


@dataclass(frozen=True, slots=True)
class Settings:
    service_name: str = "bib-platform-api"
    api_version: str = "v1"
    cors_origins: tuple[str, ...] = field(default_factory=_load_cors_origins)
    database_url: str = field(default_factory=get_database_url)
    backend_telemetry_provider: str = field(
        default_factory=get_backend_telemetry_provider
    )
    ingestion_enabled: bool = field(default_factory=get_ingestion_enabled)


settings = Settings()
