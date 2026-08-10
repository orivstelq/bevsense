import pytest
from sqlalchemy.engine import URL

from app.core.config import (
    DEFAULT_DATABASE_URL,
    get_database_sslmode,
    get_database_url,
    get_self_signup_enabled,
    normalize_database_url,
)
from app.db import engine as engine_module


def clear_database_environment(monkeypatch) -> None:
    for variable in (
        "BIB_DATABASE_URL",
        "DATABASE_URL",
        "BIB_DATABASE_SSLMODE",
        "BIB_SELF_SIGNUP_ENABLED",
    ):
        monkeypatch.delenv(variable, raising=False)


def test_self_signup_flag_defaults_off_and_parses_strictly(monkeypatch) -> None:
    clear_database_environment(monkeypatch)
    assert get_self_signup_enabled() is False
    monkeypatch.setenv("BIB_SELF_SIGNUP_ENABLED", "true")
    assert get_self_signup_enabled() is True
    monkeypatch.setenv("BIB_SELF_SIGNUP_ENABLED", "false")
    assert get_self_signup_enabled() is False
    for malformed in ("TRUE", " true ", "1", ""):
        monkeypatch.setenv("BIB_SELF_SIGNUP_ENABLED", malformed)
        with pytest.raises(ValueError, match="either true or false"):
            get_self_signup_enabled()


def test_database_url_environment_precedence(monkeypatch) -> None:
    clear_database_environment(monkeypatch)
    assert get_database_url() == normalize_database_url(DEFAULT_DATABASE_URL)

    monkeypatch.setenv("BIB_DATABASE_URL", "sqlite:///./bib-only.db")
    assert get_database_url() == normalize_database_url(
        "sqlite:///./bib-only.db"
    )

    monkeypatch.delenv("BIB_DATABASE_URL")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgres://platform:placeholder@db.example/platform",
    )
    assert get_database_url().database == "platform"

    monkeypatch.setenv("BIB_DATABASE_URL", "sqlite:///./override.db")
    assert get_database_url() == normalize_database_url(
        "sqlite:///./override.db"
    )


@pytest.mark.parametrize(
    ("configured_url", "expected_driver"),
    (
        ("sqlite:///./local.db", "sqlite"),
        (
            "postgres://user:placeholder@db.example:5432/app",
            "postgresql+psycopg",
        ),
        (
            "postgresql://user:placeholder@db.example:5432/app",
            "postgresql+psycopg",
        ),
        (
            "postgresql+psycopg://user:placeholder@db.example:5432/app",
            "postgresql+psycopg",
        ),
    ),
)
def test_database_url_normalization(
    configured_url: str,
    expected_driver: str,
) -> None:
    normalized = normalize_database_url(configured_url)

    assert normalized.drivername == expected_driver
    if expected_driver == "sqlite":
        assert normalized == URL.create(
            "sqlite",
            database="./local.db",
        )


def test_database_url_normalization_preserves_query_and_escaped_password() -> None:
    normalized = normalize_database_url(
        "postgres://user:p%40ss%3Aword@db.example:5432/app"
        "?application_name=bib&connect_timeout=5"
    )

    assert normalized.username == "user"
    assert normalized.password == "p@ss:word"
    assert normalized.host == "db.example"
    assert normalized.port == 5432
    assert normalized.database == "app"
    assert normalized.query == {
        "application_name": "bib",
        "connect_timeout": "5",
    }
    assert "p%40ss%3Aword" in normalized.render_as_string(
        hide_password=False
    )


def test_empty_and_unsupported_database_urls_fail_without_secret_exposure(
    monkeypatch,
) -> None:
    clear_database_environment(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./fallback.db")
    monkeypatch.setenv("BIB_DATABASE_URL", " ")
    with pytest.raises(ValueError, match="must not be empty"):
        get_database_url()

    secret = "do-not-print-this-password"
    with pytest.raises(ValueError) as error:
        normalize_database_url(
            f"mysql://user:{secret}@db.example/application"
        )
    assert secret not in str(error.value)


def test_database_sslmode_configuration(monkeypatch) -> None:
    clear_database_environment(monkeypatch)
    assert get_database_sslmode() is None

    monkeypatch.setenv("BIB_DATABASE_SSLMODE", " REQUIRE ")
    assert get_database_sslmode() == "require"

    monkeypatch.setenv("BIB_DATABASE_SSLMODE", "requrie")
    with pytest.raises(ValueError, match="supported PostgreSQL SSL mode"):
        get_database_sslmode()


def test_postgresql_engine_uses_psycopg_ssl_and_pool_pre_ping(
    monkeypatch,
) -> None:
    captured: dict[str, object] = {}
    sentinel = object()

    def fake_create_engine(url: URL, **options):
        captured.update(url=url, options=options)
        return sentinel

    monkeypatch.setattr(engine_module, "create_engine", fake_create_engine)

    engine = engine_module.create_database_engine(
        "postgres://user:placeholder@db.example/application",
        "require",
    )

    assert engine is sentinel
    assert captured["url"].drivername == "postgresql+psycopg"
    assert captured["options"] == {
        "pool_pre_ping": True,
        "connect_args": {"sslmode": "require"},
    }


def test_postgresql_engine_does_not_add_unconfigured_ssl_or_pool_tuning(
    monkeypatch,
) -> None:
    captured: dict[str, object] = {}

    def fake_create_engine(url: URL, **options):
        captured.update(url=url, options=options)
        return object()

    monkeypatch.setattr(engine_module, "create_engine", fake_create_engine)

    engine_module.create_database_engine(
        "postgresql+psycopg://user:placeholder@db.example/application"
    )

    assert captured["options"] == {"pool_pre_ping": True}


def test_sqlite_engine_keeps_local_options_and_foreign_keys() -> None:
    engine = engine_module.create_database_engine(
        "sqlite://",
        "require",
    )

    assert engine.url.drivername == "sqlite"
    assert not engine.pool._pre_ping
    with engine.connect() as connection:
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
    engine.dispose()
