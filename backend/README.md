# BiB Platform API

The backend is a FastAPI foundation for versioned, location-scoped BiB telemetry. It currently serves deterministic simulation fixtures; it does not connect to physical controllers, a database, cloud services, or an authentication system.

## Architecture

Requests follow one dependency path:

```text
API route -> TelemetryService -> TelemetryProvider -> validated Pydantic models
```

`SimulatedTelemetryProvider` is the current implementation. A future live provider can replace it behind `TelemetryProvider` without changing the HTTP routes.

## Local setup

From `backend/` on macOS or Linux:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Run the tests:

```bash
pytest
```

Interactive OpenAPI documentation is available at <http://localhost:8000/docs>.

## API contract

Operational routes are versioned under `/api/v1`:

- `GET /api/v1/health`
- `GET /api/v1/organizations/demo-organization/locations/demo-main-dining/snapshot`
- `GET /api/v1/organizations/demo-organization/locations/demo-secondary-dining/snapshot`

The route version (`v1`) controls endpoint evolution. The snapshot's `schemaVersion` (`1.0`) independently identifies the telemetry payload contract. External JSON uses camelCase; timestamps are timezone-aware ISO 8601 values and weights use grams.

Simulation data is fixed and deterministic. It does not represent live hardware. Unknown organization/location combinations return `404` and never fall back to another location.

For local frontend development, CORS allows `http://localhost:3000`. Set the optional comma-separated `BIB_CORS_ORIGINS` process environment variable to use other explicit origins; no `.env` file is required.

## Current boundaries

Organization and location path values scope data retrieval; they are not authorization. A future backend must authenticate users and controllers and enforce organization/location access server-side. Demo persona selection remains frontend-only presentation state and is intentionally absent from telemetry APIs.

There is currently no authentication, database, AWS integration, Docker configuration, physical hardware connection, MQTT/WebSocket transport, or live telemetry provider.
