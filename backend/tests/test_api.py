from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
MAIN_DINING_URL = (
    "/api/v1/organizations/demo-organization/locations/demo-main-dining/snapshot"
)
SECONDARY_DINING_URL = (
    "/api/v1/organizations/demo-organization/locations/"
    "demo-secondary-dining/snapshot"
)


def test_health_identifies_api_v1() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "bib-platform-api",
        "apiVersion": "v1",
    }


@pytest.mark.parametrize(
    ("url", "location_id"),
    (
        (MAIN_DINING_URL, "demo-main-dining"),
        (SECONDARY_DINING_URL, "demo-secondary-dining"),
    ),
)
def test_demo_snapshots_identify_the_requested_location(
    url: str,
    location_id: str,
) -> None:
    response = client.get(url)
    payload = response.json()

    assert response.status_code == 200
    assert payload["organizationId"] == "demo-organization"
    assert payload["locationId"] == location_id
    assert payload["organization"]["id"] == "demo-organization"
    assert payload["location"]["id"] == location_id
    assert payload["location"]["organizationId"] == "demo-organization"
    assert payload["schemaVersion"] == "1.0"
    assert payload["dataSource"] == "simulated"
    assert "schema_version" not in payload
    assert all(
        "firmwareVersion" not in controller for controller in payload["controllers"]
    )


@pytest.mark.parametrize(
    ("url", "expected_counts"),
    (
        (
            MAIN_DINING_URL,
            {
                "controllers": 1,
                "sensorTrays": 6,
                "inventoryItems": 5,
                "telemetryReadings": 6,
            },
        ),
        (
            SECONDARY_DINING_URL,
            {
                "controllers": 1,
                "sensorTrays": 3,
                "inventoryItems": 2,
                "telemetryReadings": 3,
            },
        ),
    ),
)
def test_demo_snapshot_counts(url: str, expected_counts: dict[str, int]) -> None:
    payload = client.get(url).json()

    assert {
        collection: len(payload[collection]) for collection in expected_counts
    } == expected_counts


@pytest.mark.parametrize(
    ("url", "location_id", "forbidden_id_fragment"),
    (
        (MAIN_DINING_URL, "demo-main-dining", "demo-secondary-"),
        (SECONDARY_DINING_URL, "demo-secondary-dining", "demo-main-"),
    ),
)
def test_demo_snapshots_do_not_leak_across_locations(
    url: str,
    location_id: str,
    forbidden_id_fragment: str,
) -> None:
    response = client.get(url)
    payload = response.json()

    for collection in (
        "controllers",
        "sensorTrays",
        "inventoryItems",
        "telemetryReadings",
    ):
        assert all(
            record["locationId"] == location_id for record in payload[collection]
        )
        assert all(
            record["organizationId"] == "demo-organization"
            for record in payload[collection]
        )

    assert forbidden_id_fragment not in response.text


@pytest.mark.parametrize(
    "url",
    (
        "/api/v1/organizations/demo-organization/locations/unknown-location/snapshot",
        "/api/v1/organizations/wrong-organization/locations/demo-main-dining/snapshot",
    ),
)
def test_unknown_organization_location_pairs_return_404(url: str) -> None:
    response = client.get(url)

    assert response.status_code == 404
    assert response.json() == {
        "detail": (
            "No telemetry snapshot exists for the requested organization and location."
        )
    }


@pytest.mark.parametrize("url", (MAIN_DINING_URL, SECONDARY_DINING_URL))
def test_response_timestamps_are_timezone_aware_iso_8601(url: str) -> None:
    payload = client.get(url).json()
    timestamp_values = [
        *(controller["lastSeenAt"] for controller in payload["controllers"]),
        *(item["installedAt"] for item in payload["inventoryItems"]),
        *(reading["timestamp"] for reading in payload["telemetryReadings"]),
    ]

    for value in timestamp_values:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        assert parsed.utcoffset() is not None


def test_openapi_exposes_only_versioned_operational_routes() -> None:
    response = client.get("/openapi.json")
    paths = response.json()["paths"]

    assert response.status_code == 200
    assert "/api/v1/health" in paths
    assert (
        "/api/v1/organizations/{organization_id}/locations/{location_id}/snapshot"
        in paths
    )
    assert "/health" not in paths
    assert (
        "/organizations/{organization_id}/locations/{location_id}/snapshot"
        not in paths
    )


def test_local_frontend_origin_is_allowed_by_cors() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
