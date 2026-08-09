from dataclasses import dataclass, field
from os import environ

from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


DEFAULT_CORS_ORIGINS = ("http://localhost:3000",)
DEFAULT_DATABASE_URL = "sqlite:///./bib-platform-dev.db"
DEFAULT_BACKEND_TELEMETRY_PROVIDER = "database"
DEFAULT_INGESTION_ENABLED = False
SUPPORTED_DATABASE_SSLMODES = frozenset(
    {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}
)
SUPPORTED_DATABASE_DRIVERS = frozenset(
    {
        "sqlite",
        "sqlite+pysqlite",
        "postgres",
        "postgresql",
        "postgresql+psycopg",
    }
)


def _load_cors_origins() -> tuple[str, ...]:
    configured_origins = environ.get("BIB_CORS_ORIGINS")
    if configured_origins is None:
        return DEFAULT_CORS_ORIGINS

    return tuple(
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    )


def normalize_database_url(database_url: str | URL) -> URL:
    try:
        url = make_url(database_url)
    except ArgumentError as error:
        raise ValueError(
            "The configured database URL is not a valid SQLAlchemy URL."
        ) from error

    if url.drivername not in SUPPORTED_DATABASE_DRIVERS:
        raise ValueError(
            "The configured database URL must use SQLite or PostgreSQL."
        )
    if url.drivername in {"postgres", "postgresql"}:
        return url.set(drivername="postgresql+psycopg")
    return url


def get_database_url() -> URL:
    if "BIB_DATABASE_URL" in environ:
        configured_url = environ["BIB_DATABASE_URL"]
    elif "DATABASE_URL" in environ:
        configured_url = environ["DATABASE_URL"]
    else:
        configured_url = DEFAULT_DATABASE_URL

    if not configured_url.strip():
        raise ValueError("The configured database URL must not be empty.")
    return normalize_database_url(configured_url.strip())


def get_database_sslmode() -> str | None:
    configured_sslmode = environ.get("BIB_DATABASE_SSLMODE")
    if configured_sslmode is None:
        return None

    sslmode = configured_sslmode.strip().lower()
    if sslmode not in SUPPORTED_DATABASE_SSLMODES:
        raise ValueError(
            "BIB_DATABASE_SSLMODE must be a supported PostgreSQL SSL mode."
        )
    return sslmode


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
    service_name: str = "bevsense-api"
    api_version: str = "v1"
    cors_origins: tuple[str, ...] = field(default_factory=_load_cors_origins)
    database_url: URL = field(default_factory=get_database_url)
    database_sslmode: str | None = field(default_factory=get_database_sslmode)
    backend_telemetry_provider: str = field(
        default_factory=get_backend_telemetry_provider
    )
    ingestion_enabled: bool = field(default_factory=get_ingestion_enabled)


settings = Settings()
