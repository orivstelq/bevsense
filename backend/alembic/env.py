from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import URL

from app.core.config import (
    get_database_sslmode,
    get_database_url,
    normalize_database_url,
)
from app.db import models as _models
from app.db.base import Base
from app.db.engine import create_database_engine


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def migration_database_url() -> URL:
    configured_url = config.attributes.get("database_url")
    return (
        normalize_database_url(configured_url)
        if configured_url is not None
        else get_database_url()
    )


def run_migrations_offline() -> None:
    context.configure(
        url=migration_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_database_engine(
        migration_database_url(),
        get_database_sslmode(),
    )

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
