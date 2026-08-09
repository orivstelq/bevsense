from functools import lru_cache

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.exc import NoSuchModuleError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import normalize_database_url, settings


SessionFactory = sessionmaker[Session]


def create_database_engine(
    database_url: str | URL,
    database_sslmode: str | None = None,
) -> Engine:
    url = normalize_database_url(database_url)
    backend_name = url.get_backend_name()
    engine_options: dict[str, object] = {}
    if backend_name == "sqlite":
        engine_options["connect_args"] = {"check_same_thread": False}
    elif backend_name == "postgresql":
        engine_options["pool_pre_ping"] = True
        if database_sslmode is not None:
            engine_options["connect_args"] = {"sslmode": database_sslmode}

    try:
        engine = create_engine(url, **engine_options)
    except NoSuchModuleError as error:
        raise ValueError(
            "The configured database URL uses an unavailable database driver."
        ) from error

    if backend_name == "sqlite":

        @event.listens_for(engine, "connect")
        def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_session_factory(engine: Engine) -> SessionFactory:
    return sessionmaker(bind=engine, expire_on_commit=False)


@lru_cache
def get_session_factory() -> SessionFactory:
    return create_session_factory(
        create_database_engine(
            settings.database_url,
            settings.database_sslmode,
        )
    )
