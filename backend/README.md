# BiB Platform API

The backend is a FastAPI service for versioned, location-scoped BiB telemetry. Its normal data path is:

```text
API route -> TelemetryService -> DatabaseTelemetryProvider
          -> TelemetryRepository -> SQLAlchemy -> relational database
```

Local development uses SQLite. Alembic owns schema history, and the demo seed command persists the same deterministic simulated snapshots used by the explicit backend simulation provider.

## Local setup

From `backend/` on macOS or Linux:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

alembic upgrade head
python -m app.scripts.seed_demo_data
uvicorn app.main:app --reload --port 8000
```

The default database URL is `sqlite:///./bib-platform-dev.db`, creating `backend/bib-platform-dev.db` when migrations run. The file is ignored by Git. Override it through the process environment when needed:

```bash
BIB_DATABASE_URL=sqlite:///./another-local.db
```

Migrations and seeding are explicit operations. Application startup and API requests never create tables, seed data, or switch providers automatically.

## Provider selection

The default backend provider is persistent database mode:

```bash
BIB_BACKEND_TELEMETRY_PROVIDER=database
```

To deliberately serve the original in-process deterministic snapshots without a database:

```bash
BIB_BACKEND_TELEMETRY_PROVIDER=simulated
```

Database failures do not fall back to simulation. Run `alembic upgrade head` before database-mode requests and seed only when demo data is wanted.

## API and tests

Operational routes remain under `/api/v1`:

- `GET /api/v1/health`
- `GET /api/v1/organizations/{organization_id}/locations/{location_id}/snapshot`

The route version is `v1`; telemetry payloads use `schemaVersion: "1.0"`, camelCase JSON, timezone-aware ISO-8601 timestamps, and grams. Interactive documentation is available at <http://localhost:8000/docs>.

Run tests with:

```bash
pytest
```

Tests migrate and seed isolated temporary SQLite databases. They do not use the local development database.

## Current boundaries

Persisted seed readings remain simulated and do not represent physical hardware. Organization/location path values scope database queries but are not authorization. Authentication, user authorization, controller ingestion, AWS, Docker, and deployment configuration are not implemented yet. The SQLAlchemy models and Alembic migration use portable relational types; PostgreSQL support and its driver will be added during deployment work.
