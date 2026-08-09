# BiB Platform API

The backend is a FastAPI service for versioned, location-scoped BiB telemetry. Its normal data path is:

```text
API route -> TelemetryService -> DatabaseTelemetryProvider
          -> TelemetryRepository -> SQLAlchemy -> relational database
```

Development-only writes use a separate path:

```text
simulated controller -> PUT API -> TelemetryIngestionService
                     -> TelemetryIngestionRepository -> SQLAlchemy transaction
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

## Development telemetry ingestion

Controller ingestion is disabled by default. It requires persistent database read mode and must be enabled explicitly with the exact boolean values `true` or `false`:

```bash
BIB_BACKEND_TELEMETRY_PROVIDER=database
BIB_INGESTION_ENABLED=true
```

`BIB_INGESTION_ENABLED` is a development feature gate, not authentication or authorization. Phase 2F has no device credentials, signed requests, replay protection beyond reading-ID idempotency, or production security controls.

The versioned endpoint is:

```text
PUT /api/v1/organizations/{organization_id}/locations/{location_id}/controllers/{controller_id}/readings/{reading_id}
```

It accepts `trayId`, a timezone-aware `timestamp`, and nonnegative finite `grossWeightGrams`. The server assigns `dataSource: simulated`. Reading IDs are globally unique: a new immutable reading returns `201`, an equivalent retry returns `200`, and conflicting reuse returns `409`. Readings are appended to history; no inventory assignment or derived values are changed.

For a disposable local demo, migrate and seed a database, enable ingestion, and run FastAPI:

```bash
export BIB_DATABASE_URL=sqlite:///./phase2f-demo.db
export BIB_BACKEND_TELEMETRY_PROVIDER=database
export BIB_INGESTION_ENABLED=true
alembic upgrade head
python -m app.scripts.seed_demo_data
uvicorn app.main:app --reload --port 8000
```

In another activated backend terminal, send a deterministic reading through HTTP:

```bash
python -m app.scripts.send_simulated_reading \
  --organization-id demo-organization \
  --location-id demo-main-dining \
  --controller-id demo-main-controller-01 \
  --tray-id demo-main-tray-01 \
  --reading-id phase2f-manual-reading-001 \
  --timestamp 2026-08-09T05:00:00Z \
  --gross-weight-grams 4650
```

Refresh the existing frontend to retrieve the updated snapshot. Phase 2F adds no WebSockets, SSE, or polling. If the backend read provider is deliberately set to `simulated`, database ingestion is rejected because writes would not appear in that provider's snapshots.

## API and tests

Operational routes remain under `/api/v1`:

- `GET /api/v1/health`
- `GET /api/v1/organizations/{organization_id}/locations/{location_id}/snapshot`
- `PUT /api/v1/organizations/{organization_id}/locations/{location_id}/controllers/{controller_id}/readings/{reading_id}`

The route version is `v1`; telemetry payloads use `schemaVersion: "1.0"`, camelCase JSON, timezone-aware ISO-8601 timestamps, and grams. Interactive documentation is available at <http://localhost:8000/docs>.

Run tests with:

```bash
pytest
```

Tests migrate and seed isolated temporary SQLite databases. They do not use the local development database.

## Current boundaries

Persisted seed and ingested readings remain simulated and do not represent physical hardware. Controller IDs and organization/location paths scope data but do not prove identity or provide authorization. Authentication, user authorization, rate limiting, physical hardware ingestion, MQTT, AWS, Docker, and deployment configuration are not implemented. The SQLAlchemy models and Alembic migration use portable relational types; PostgreSQL support and its driver will be added during deployment work.
