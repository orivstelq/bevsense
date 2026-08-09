# BiB Platform API

The backend is a FastAPI service for versioned, location-scoped BiB telemetry. Its normal data path is:

```text
API route -> TelemetryService -> DatabaseTelemetryProvider
          -> TelemetryRepository -> SQLAlchemy -> relational database
```

Development-only writes use a separate path:

```text
simulated controller -> bearer credential -> TelemetryIngestionService
                     -> ControllerAuthenticationService
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

`BIB_INGESTION_ENABLED` is a development feature gate, not authentication or authorization. Each controller must also present its own opaque credential as `Authorization: Bearer <controller-token>`. The database stores only the credential's SHA-256 digest, bound to the exact organization, location, and controller. Raw tokens are shown once by the local issuance command and cannot be recovered from the server.

The versioned endpoint is:

```text
PUT /api/v1/organizations/{organization_id}/locations/{location_id}/controllers/{controller_id}/readings/{reading_id}
```

It accepts `trayId`, a timezone-aware `timestamp`, and nonnegative finite `grossWeightGrams`. The server assigns `dataSource: simulated`. Reading IDs are globally unique: a new immutable reading returns `201`, an equivalent retry returns `200`, and conflicting reuse returns `409`. Readings are appended to history; no inventory assignment or derived values are changed.

There is no public credential-provisioning API. For a disposable local demo, migrate and seed a database:

```bash
export BIB_DATABASE_URL=sqlite:///./phase2g-demo.db
alembic upgrade head
python -m app.scripts.seed_demo_data
```

Issue a credential and capture its one-time raw token in the simulated controller's environment:

```bash
export BIB_CONTROLLER_TOKEN="$(
  python -m app.scripts.issue_dev_controller_credential \
    --organization-id demo-organization \
    --location-id demo-main-dining \
    --controller-id demo-main-controller-01 \
    --print-token-only
)"
```

Start FastAPI in database mode with ingestion enabled:

```bash
export BIB_BACKEND_TELEMETRY_PROVIDER=database
export BIB_INGESTION_ENABLED=true
uvicorn app.main:app --reload --port 8000
```

In another activated backend terminal with `BIB_CONTROLLER_TOKEN` exported, send a deterministic reading through HTTP:

```bash
python -m app.scripts.send_simulated_reading \
  --organization-id demo-organization \
  --location-id demo-main-dining \
  --controller-id demo-main-controller-01 \
  --tray-id demo-main-tray-01 \
  --reading-id phase2g-manual-reading-001 \
  --timestamp 2026-08-09T18:00:00Z \
  --gross-weight-grams 10900

unset BIB_CONTROLLER_TOKEN
```

The sender reads the token only from `BIB_CONTROLLER_TOKEN`; it never accepts the token as a command-line argument or includes it in the URL/body. Refresh the existing frontend to retrieve the updated snapshot. Ingested data remains `simulated`. No WebSockets, SSE, or polling are used. If the backend read provider is deliberately set to `simulated`, ingestion is rejected because database writes would not appear in that provider's snapshots.

This is a development controller-authentication foundation, not a production security system. It provides per-controller credentials and scope binding, but not human authentication, RBAC, rate limiting, credential rotation/revocation, or complete cryptographic replay protection. Reading-ID idempotency only prevents duplicate record creation. Production controller traffic requires HTTPS/TLS; local HTTP is for loopback development only.

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

Persisted seed and ingested readings remain simulated and do not represent physical hardware. Controller bearer credentials authenticate configured simulated controllers, but dashboard users still have no authentication or authorization. Credential lifecycle management, RBAC, rate limiting, physical hardware ingestion, MQTT, AWS, Docker, TLS deployment, and deployment configuration are not implemented. The SQLAlchemy models and Alembic migrations use portable relational types; PostgreSQL support and its driver will be added during deployment work.
