from dataclasses import dataclass
from os import environ


DEFAULT_CORS_ORIGINS = ("http://localhost:3000",)


def _load_cors_origins() -> tuple[str, ...]:
    configured_origins = environ.get("BIB_CORS_ORIGINS")
    if configured_origins is None:
        return DEFAULT_CORS_ORIGINS

    return tuple(
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    )


@dataclass(frozen=True, slots=True)
class Settings:
    service_name: str = "bib-platform-api"
    api_version: str = "v1"
    cors_origins: tuple[str, ...] = _load_cors_origins()


settings = Settings()
