from functools import lru_cache

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError, NoSuchModuleError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


SessionFactory = sessionmaker[Session]


def create_database_engine(database_url: str) -> Engine:
    try:
        url = make_url(database_url)
    except ArgumentError as error:
        raise ValueError("BIB_DATABASE_URL is not a valid SQLAlchemy URL.") from error

    connect_args = (
        {"check_same_thread": False} if url.get_backend_name() == "sqlite" else {}
    )
    try:
        engine = create_engine(url, connect_args=connect_args)
    except NoSuchModuleError as error:
        raise ValueError(
            "BIB_DATABASE_URL uses an unavailable database dialect or driver."
        ) from error

    if url.get_backend_name() == "sqlite":

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
    return create_session_factory(create_database_engine(settings.database_url))
