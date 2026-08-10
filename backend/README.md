# BevSense API

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

Local development uses SQLite, while production database mode also supports PostgreSQL through synchronous SQLAlchemy and Psycopg 3. Alembic owns schema history, and the demo seed command persists the same deterministic simulated snapshots used by the explicit backend simulation provider.

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

The default database URL is `sqlite:///./bib-platform-dev.db`, creating `backend/bib-platform-dev.db` when migrations run. The file is ignored by Git.

## Database configuration

Database URL precedence is:

1. `BIB_DATABASE_URL`, the explicit BevSense override
2. `DATABASE_URL`, commonly supplied by hosting platforms
3. `sqlite:///./bib-platform-dev.db`, the local default

Supported URL forms are `sqlite:///`, `postgres://`, `postgresql://`, and `postgresql+psycopg://`. PostgreSQL forms are normalized internally to the Psycopg 3 dialect without changing credentials, query parameters, or escaping. Database URLs can contain passwords and must be treated as secrets; never commit or log a production value.

Local SQLite override:

```bash
BIB_DATABASE_URL=sqlite:///./another-local.db
```

PostgreSQL SSL is optional unless configured. Set `BIB_DATABASE_SSLMODE` to a libpq mode such as `require`; SQLite does not receive PostgreSQL SSL options. PostgreSQL uses SQLAlchemy's standard pool with stale-connection pre-ping and no custom pool sizing.

Migrations and seeding are explicit operations. Application startup and API requests never create tables, seed data, switch providers, or fall back from an unavailable configured PostgreSQL database to SQLite. Run migrations against the selected environment URL:

```bash
BIB_DATABASE_URL=sqlite:///./another-local.db alembic upgrade head
```

The demo seed command remains opt-in and must not be run automatically against production. A later Heroku phase will consume the platform-provided `DATABASE_URL`, configure `BIB_DATABASE_SSLMODE=require` (or stronger verified-certificate settings), and run migrations as an explicit release operation. Phase 2J does not create or configure Heroku resources.

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

### Development credential lifecycle

Credential lifecycle commands are local operator tools; there are no public credential-management endpoints. A credential is active while its `revoked_at` database field is null. Revocation sets that field once and permanently excludes the credential from authentication. Raw tokens remain one-time output from issuance and cannot be listed, recovered, or reconstructed from stored SHA-256 digests.

List safe credential metadata for one exact controller scope:

```bash
python -m app.scripts.list_dev_controller_credentials \
  --organization-id demo-organization \
  --location-id demo-main-dining \
  --controller-id demo-main-controller-01
```

The command prints credential IDs, creation times, active/revoked status, revocation times, and counts. It never prints raw tokens or digests.

Use staged rotation so the controller can be verified before its prior credential is disabled:

1. Issue credential B while credential A remains active.
2. Configure and test the controller with B.
3. Revoke A by its credential ID:

```bash
python -m app.scripts.revoke_dev_controller_credential \
  --organization-id demo-organization \
  --location-id demo-main-dining \
  --controller-id demo-main-controller-01 \
  --credential-id credential-a
```

Issuance never revokes older credentials automatically. Revoking an already revoked credential is idempotent and preserves its original revocation time. Revoking the final active credential is allowed, but the command emits a warning that the controller has no active credentials. There is no unrevoke operation; issue a new credential instead.

This is a development controller-authentication foundation. It remains separate from human portal authentication and provides per-controller credentials, scope binding, and local issuance/list/revocation tools, but not rate limiting, credential expiration, automated rotation, audit history, or complete cryptographic replay protection. Reading-ID idempotency only prevents duplicate record creation. Production controller traffic requires HTTPS/TLS; local HTTP is for loopback development only.

## Human portal authentication

Human authentication is disabled by default and is controlled independently from controller ingestion:

```bash
BIB_HUMAN_AUTH_ENABLED=false
# BIB_SUPABASE_URL=https://project-ref.supabase.co
# BIB_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
```

When enabled, the URL and publishable Auth key are required. FastAPI validates each bearer token server-side through the Supabase Auth user endpoint, then resolves the BevSense profile, organization membership, role, and any location assignments from PostgreSQL. It does not decode and trust unverified JWT claims. Missing or invalid human credentials return `401`; an authenticated identity without permitted organization/location access returns `403`. Health remains public. Controller ingestion continues to require its separate controller credential.

Migration `20260809_0004` adds `user_profiles`, `organization_memberships`, and `location_assignments` without changing telemetry tables. The tables store only the Supabase Auth user UUID and BevSense access metadata; they never store passwords or password hashes. The migration does not create a cross-schema foreign key to `auth.users` because local SQLite migration tests and non-Supabase databases must remain portable. Identity existence is instead established by verified Supabase authentication before application authorization.

Associate an existing Supabase Auth user with BevSense after migrating the selected database:

```bash
python -m app.scripts.provision_human_membership \
  --auth-user-id 00000000-0000-0000-0000-000000000000 \
  --display-name "Example User" \
  --organization-id demo-organization \
  --role utility-worker \
  --location-id demo-main-dining
```

The command accepts no password or privileged Supabase key. It validates the role, organization, location scope, language, and assignment rules, then writes only BevSense profile and membership data through the configured `BIB_DATABASE_URL`. Use a real existing Auth UUID when configuring an environment; the UUID above is documentation-only.

## API and tests

Operational routes remain under `/api/v1`:

- `GET /api/v1/health`
- `GET /api/v1/me`
- `GET /api/v1/organizations/{organization_id}/locations/{location_id}/snapshot`
- `PUT /api/v1/organizations/{organization_id}/locations/{location_id}/controllers/{controller_id}/readings/{reading_id}`

The route version is `v1`; telemetry payloads use `schemaVersion: "1.0"`, camelCase JSON, timezone-aware ISO-8601 timestamps, and grams. Interactive documentation is available at <http://localhost:8000/docs>.

Run tests with:

```bash
pytest
```

Tests migrate and seed isolated temporary SQLite databases. They do not use the local development database.

## Current boundaries

Persisted seed and ingested readings remain simulated and do not represent physical hardware. Human authentication and server-side role/location authorization are implemented behind an off-by-default feature flag, but real Supabase users and deployment environment variables must be configured manually. There is no user-administration console, password storage, service-role automation, or claim that presentation personas provide security. Rate limiting, physical hardware ingestion, MQTT, AWS, Docker, TLS deployment, and deployment configuration are not implemented. The same portable SQLAlchemy models, migrations, repositories, and services support SQLite and PostgreSQL; real managed-PostgreSQL and remote Supabase Auth verification remain deployment work.
