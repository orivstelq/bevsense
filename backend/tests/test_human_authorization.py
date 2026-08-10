from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.db.models import (
    LocationAssignmentRecord,
    OrganizationMembershipRecord,
    UserProfileRecord,
)
from app.scripts.provision_human_membership import provision
from app.dependencies import (
    get_human_auth_enabled,
    get_human_authorization_service,
)
from app.main import app
from app.security.human_tokens import (
    AuthenticatedHuman,
    InvalidHumanTokenError,
)
from app.services.human_authorization_service import HumanAuthorizationService
from tests.conftest import DatabaseFixture


UTILITY_ID = UUID("00000000-0000-0000-0000-000000000101")
SUPERVISOR_ID = UUID("00000000-0000-0000-0000-000000000102")
TECHNICIAN_ID = UUID("00000000-0000-0000-0000-000000000103")
INACTIVE_ID = UUID("00000000-0000-0000-0000-000000000104")
ADMIN_ID = UUID("00000000-0000-0000-0000-000000000105")
INACTIVE_MEMBERSHIP_ID = UUID("00000000-0000-0000-0000-000000000106")
PROVISIONED_ID = UUID("00000000-0000-0000-0000-000000000107")


class StaticTokenVerifier:
    identities = {
        "utility-token": UTILITY_ID,
        "supervisor-token": SUPERVISOR_ID,
        "technician-token": TECHNICIAN_ID,
        "inactive-token": INACTIVE_ID,
        "admin-token": ADMIN_ID,
        "inactive-membership-token": INACTIVE_MEMBERSHIP_ID,
    }

    def verify(self, token: str) -> AuthenticatedHuman:
        auth_user_id = self.identities.get(token)
        if auth_user_id is None:
            raise InvalidHumanTokenError("Invalid human access token.")
        return AuthenticatedHuman(auth_user_id)


@pytest.fixture
def human_auth_service(seeded_database: DatabaseFixture):
    now = datetime(2026, 8, 9, tzinfo=UTC)
    users = (
        (UTILITY_ID, "Utility User", True, "utility-worker"),
        (SUPERVISOR_ID, "Supervisor User", True, "supervisor-manager"),
        (TECHNICIAN_ID, "Technician User", True, "technician"),
        (INACTIVE_ID, "Inactive User", False, "organization-admin"),
        (ADMIN_ID, "Admin User", True, "organization-admin"),
        (
            INACTIVE_MEMBERSHIP_ID,
            "Inactive Membership User",
            True,
            "supervisor-manager",
        ),
    )
    with seeded_database.session_factory() as session:
        for user_id, display_name, active, role in users:
            session.add(
                UserProfileRecord(
                    auth_user_id=user_id,
                    display_name=display_name,
                    preferred_language="en",
                    is_active=active,
                    created_at=now,
                    updated_at=now,
                )
            )
        session.flush()
        for user_id, _display_name, _active, role in users:
            session.add(
                OrganizationMembershipRecord(
                    auth_user_id=user_id,
                    organization_id="demo-organization",
                    role=role,
                    is_active=user_id != INACTIVE_MEMBERSHIP_ID,
                    created_at=now,
                )
            )
        session.flush()
        for user_id in (UTILITY_ID, TECHNICIAN_ID):
            session.add(
                LocationAssignmentRecord(
                    auth_user_id=user_id,
                    organization_id="demo-organization",
                    location_id="demo-main-dining",
                    created_at=now,
                )
            )
        session.commit()

    return HumanAuthorizationService(
        seeded_database.session_factory,
        StaticTokenVerifier(),
    )


@pytest.fixture
def protected_client(client: TestClient, human_auth_service):
    app.dependency_overrides[get_human_auth_enabled] = lambda: True
    app.dependency_overrides[get_human_authorization_service] = (
        lambda: human_auth_service
    )
    yield client


def snapshot(client: TestClient, token: str | None, location: str):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return client.get(
        f"/api/v1/organizations/demo-organization/locations/{location}/snapshot",
        headers=headers,
    )


def test_protected_snapshot_requires_valid_human_token(protected_client):
    assert snapshot(protected_client, None, "demo-main-dining").status_code == 401
    assert snapshot(protected_client, "invalid", "demo-main-dining").status_code == 401
    assert snapshot(
        protected_client, "controller-token", "demo-main-dining"
    ).status_code == 401


def test_utility_worker_is_limited_to_assigned_location(protected_client):
    assert snapshot(
        protected_client, "utility-token", "demo-main-dining"
    ).status_code == 200
    assert snapshot(
        protected_client, "utility-token", "demo-secondary-dining"
    ).status_code == 403


def test_supervisor_can_read_organization_locations_but_not_cross_org(
    protected_client,
):
    assert snapshot(
        protected_client, "supervisor-token", "demo-secondary-dining"
    ).status_code == 200
    response = protected_client.get(
        "/api/v1/organizations/other-organization/locations/demo-main-dining/snapshot",
        headers={"Authorization": "Bearer supervisor-token"},
    )
    assert response.status_code == 403


def test_inactive_profile_is_forbidden(protected_client):
    assert snapshot(
        protected_client, "inactive-token", "demo-main-dining"
    ).status_code == 403
    assert snapshot(
        protected_client,
        "inactive-membership-token",
        "demo-main-dining",
    ).status_code == 403


def test_organization_admin_can_read_organization_locations(protected_client):
    assert snapshot(
        protected_client, "admin-token", "demo-secondary-dining"
    ).status_code == 200


def test_technician_is_limited_to_assigned_service_location(protected_client):
    assert snapshot(
        protected_client, "technician-token", "demo-main-dining"
    ).status_code == 200
    assert snapshot(
        protected_client, "technician-token", "demo-secondary-dining"
    ).status_code == 403


def test_account_endpoint_returns_server_resolved_role(protected_client):
    response = protected_client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer utility-token"},
    )
    assert response.status_code == 200
    assert response.json()["memberships"] == [
        {
            "organizationId": "demo-organization",
            "role": "utility-worker",
            "locationIds": ["demo-main-dining"],
        }
    ]


def test_human_token_does_not_authenticate_controller_ingestion(
    ingestion_client: TestClient,
):
    response = ingestion_client.put(
        "/api/v1/organizations/demo-organization/locations/demo-main-dining"
        "/controllers/demo-main-controller-01/readings/human-token-attempt",
        headers={"Authorization": "Bearer utility-token"},
        json={
            "trayId": "demo-main-tray-01",
            "timestamp": "2026-08-09T12:00:00Z",
            "grossWeightGrams": 1000,
        },
    )
    assert response.status_code == 401


def test_provisioning_associates_existing_auth_identity_with_scoped_access(
    seeded_database: DatabaseFixture,
):
    provision(
        seeded_database.session_factory,
        auth_user_id=PROVISIONED_ID,
        display_name="Provisioned Utility",
        organization_id="demo-organization",
        role="utility-worker",
        location_ids=("demo-main-dining",),
        preferred_language="es",
    )

    with seeded_database.session_factory() as session:
        profile = session.get(UserProfileRecord, PROVISIONED_ID)
        membership = session.get(
            OrganizationMembershipRecord,
            (PROVISIONED_ID, "demo-organization"),
        )
        assignment = session.get(
            LocationAssignmentRecord,
            (PROVISIONED_ID, "demo-organization", "demo-main-dining"),
        )

    assert profile is not None
    assert profile.preferred_language == "es"
    assert membership is not None
    assert membership.role == "utility-worker"
    assert assignment is not None


@pytest.mark.parametrize(
    ("role", "location_ids", "message"),
    [
        ("utility-worker", (), "exactly one"),
        ("utility-worker", ("demo-main-dining", "demo-secondary-dining"), "exactly one"),
        ("technician", (), "at least one"),
        ("unknown-role", (), "Unsupported"),
    ],
)
def test_provisioning_rejects_invalid_role_assignment_rules(
    seeded_database: DatabaseFixture,
    role: str,
    location_ids: tuple[str, ...],
    message: str,
):
    with pytest.raises(ValueError, match=message):
        provision(
            seeded_database.session_factory,
            auth_user_id=PROVISIONED_ID,
            display_name="Provisioned User",
            organization_id="demo-organization",
            role=role,
            location_ids=location_ids,
        )


def test_provisioning_rejects_location_outside_organization(
    seeded_database: DatabaseFixture,
):
    with pytest.raises(ValueError, match="belong to the organization"):
        provision(
            seeded_database.session_factory,
            auth_user_id=PROVISIONED_ID,
            display_name="Provisioned Technician",
            organization_id="demo-organization",
            role="technician",
            location_ids=("unknown-location",),
        )
