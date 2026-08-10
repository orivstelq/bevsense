from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.models import (
    AccessRequestRecord,
    LocationAssignmentRecord,
    LocationRecord,
    OrganizationMembershipRecord,
    OrganizationRecord,
    UserProfileRecord,
)
from app.dependencies import (
    get_access_request_service,
    get_human_auth_enabled,
    get_human_authorization_service,
    get_self_signup_enabled,
)
from app.main import app
from app.security.human_tokens import (
    AuthenticatedHuman,
    InvalidHumanTokenError,
)
from app.services.access_request_service import AccessRequestService
from app.services.human_authorization_service import HumanAuthorizationService
from tests.conftest import DatabaseFixture


REQUESTER_ID = UUID("00000000-0000-0000-0000-000000000201")
SECOND_REQUESTER_ID = UUID("00000000-0000-0000-0000-000000000202")
SUPERVISOR_ID = UUID("00000000-0000-0000-0000-000000000203")
ADMIN_ID = UUID("00000000-0000-0000-0000-000000000204")
UTILITY_ID = UUID("00000000-0000-0000-0000-000000000205")
OTHER_SUPERVISOR_ID = UUID("00000000-0000-0000-0000-000000000206")
UNVERIFIED_REQUESTER_ID = UUID("00000000-0000-0000-0000-000000000207")


class OnboardingTokenVerifier:
    identities = {
        "requester-token": AuthenticatedHuman(
            REQUESTER_ID, "requester@example.com"
        ),
        "second-requester-token": AuthenticatedHuman(
            SECOND_REQUESTER_ID, "second@example.com"
        ),
        "supervisor-token": AuthenticatedHuman(
            SUPERVISOR_ID, "supervisor@example.com"
        ),
        "admin-token": AuthenticatedHuman(ADMIN_ID, "admin@example.com"),
        "utility-token": AuthenticatedHuman(UTILITY_ID, "utility@example.com"),
        "other-supervisor-token": AuthenticatedHuman(
            OTHER_SUPERVISOR_ID, "other@example.com"
        ),
        "unverified-requester-token": AuthenticatedHuman(
            UNVERIFIED_REQUESTER_ID
        ),
    }

    def verify(self, token: str) -> AuthenticatedHuman:
        identity = self.identities.get(token)
        if identity is None:
            raise InvalidHumanTokenError("Invalid human access token.")
        return identity


@pytest.fixture
def onboarding_services(seeded_database: DatabaseFixture):
    now = datetime(2026, 8, 10, tzinfo=UTC)
    with seeded_database.session_factory.begin() as session:
        session.add(OrganizationRecord(id="other-organization", name="Other Org"))
        session.flush()
        session.add(
            LocationRecord(
                id="other-location",
                organization_id="other-organization",
                name="Other Dining",
            )
        )
        active_users = (
            (SUPERVISOR_ID, "Supervisor", "demo-organization", "supervisor-manager"),
            (ADMIN_ID, "Admin", "demo-organization", "organization-admin"),
            (UTILITY_ID, "Utility", "demo-organization", "utility-worker"),
            (
                OTHER_SUPERVISOR_ID,
                "Other Supervisor",
                "other-organization",
                "supervisor-manager",
            ),
        )
        for user_id, name, _organization_id, _role in active_users:
            session.add(
                UserProfileRecord(
                    auth_user_id=user_id,
                    display_name=name,
                    preferred_language="en",
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
            )
        session.flush()
        for user_id, _name, organization_id, role in active_users:
            session.add(
                OrganizationMembershipRecord(
                    auth_user_id=user_id,
                    organization_id=organization_id,
                    role=role,
                    is_active=True,
                    created_at=now,
                )
            )
        session.flush()
        session.add(
            LocationAssignmentRecord(
                auth_user_id=UTILITY_ID,
                organization_id="demo-organization",
                location_id="demo-main-dining",
                created_at=now,
            )
        )

    verifier = OnboardingTokenVerifier()
    return (
        AccessRequestService(seeded_database.session_factory),
        HumanAuthorizationService(seeded_database.session_factory, verifier),
    )


@pytest.fixture
def onboarding_client(
    client: TestClient,
    onboarding_services: tuple[AccessRequestService, HumanAuthorizationService],
):
    access_service, auth_service = onboarding_services
    app.dependency_overrides[get_human_auth_enabled] = lambda: True
    app.dependency_overrides[get_self_signup_enabled] = lambda: True
    app.dependency_overrides[get_access_request_service] = lambda: access_service
    app.dependency_overrides[get_human_authorization_service] = lambda: auth_service
    yield client


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def request_body(
    *,
    organization_id: str = "demo-organization",
    location_id: str = "demo-main-dining",
    role: str = "utility-worker",
) -> dict[str, str]:
    return {
        "fullName": "New BevSense User",
        "organizationId": organization_id,
        "locationId": location_id,
        "requestedRole": role,
    }


def submit(
    client: TestClient,
    token: str = "requester-token",
    **body_overrides: str,
):
    body = request_body()
    body.update(body_overrides)
    return client.post(
        "/api/v1/account/access-request",
        headers=auth(token),
        json=body,
    )


def approve(
    client: TestClient,
    request_id: str,
    *,
    token: str = "supervisor-token",
    role: str = "utility-worker",
    location_id: str | None = "demo-main-dining",
):
    return client.post(
        f"/api/v1/access-requests/{request_id}/approve",
        headers=auth(token),
        json={"approvedRole": role, "approvedLocationId": location_id},
    )


def test_public_signup_options_are_safe_and_feature_gated(
    onboarding_client: TestClient,
):
    response = onboarding_client.get("/api/v1/public/signup-options")
    assert response.status_code == 200
    assert set(response.json()) == {"organizations", "locations"}
    assert all(set(item) == {"id", "name"} for item in response.json()["organizations"])
    assert all(
        set(item) == {"id", "organizationId", "name"}
        for item in response.json()["locations"]
    )
    for private_field in (
        "controllers",
        "sensorTrays",
        "inventoryItems",
        "telemetryReadings",
        "users",
        "memberships",
    ):
        assert private_field not in response.text

    app.dependency_overrides[get_self_signup_enabled] = lambda: False
    assert (
        onboarding_client.get("/api/v1/public/signup-options").status_code
        == 404
    )


@pytest.mark.parametrize("token", (None, "invalid", "controller-token"))
def test_self_request_requires_valid_human_identity(
    onboarding_client: TestClient,
    token: str | None,
):
    headers = auth(token) if token else {}
    response = onboarding_client.post(
        "/api/v1/account/access-request",
        headers=headers,
        json=request_body(),
    )
    assert response.status_code == 401


@pytest.mark.parametrize("token", (None, "invalid", "controller-token"))
def test_access_status_requires_valid_human_identity(
    onboarding_client: TestClient,
    token: str | None,
):
    headers = auth(token) if token else {}
    assert (
        onboarding_client.get(
            "/api/v1/account/access-status",
            headers=headers,
        ).status_code
        == 401
    )


def test_authenticated_identity_creates_one_inactive_pending_request(
    onboarding_client: TestClient,
    seeded_database: DatabaseFixture,
):
    first = submit(onboarding_client)
    second = submit(onboarding_client)
    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["verifiedEmail"] == "requester@example.com"

    with seeded_database.session_factory() as session:
        profile = session.get(UserProfileRecord, REQUESTER_ID)
        request_count = session.scalar(
            select(func.count()).select_from(AccessRequestRecord).where(
                AccessRequestRecord.auth_user_id == REQUESTER_ID
            )
        )
        membership = session.get(
            OrganizationMembershipRecord,
            (REQUESTER_ID, "demo-organization"),
        )
    assert profile is not None and not profile.is_active
    assert request_count == 1
    assert membership is None


def test_self_request_is_disabled_by_feature_flag(
    onboarding_client: TestClient,
):
    app.dependency_overrides[get_self_signup_enabled] = lambda: False
    assert submit(onboarding_client).status_code == 404


def test_self_request_requires_a_verified_email(
    onboarding_client: TestClient,
):
    assert (
        submit(onboarding_client, token="unverified-requester-token").status_code
        == 422
    )


@pytest.mark.parametrize("field", ("authUserId", "verifiedEmail"))
def test_identity_fields_cannot_be_spoofed_in_request_body(
    onboarding_client: TestClient,
    field: str,
):
    body = request_body()
    body[field] = str(SECOND_REQUESTER_ID)
    response = onboarding_client.post(
        "/api/v1/account/access-request",
        headers=auth("requester-token"),
        json=body,
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "overrides",
    (
        {"organizationId": "unknown"},
        {"locationId": "unknown"},
        {
            "organizationId": "demo-organization",
            "locationId": "other-location",
        },
        {"requestedRole": "organization-admin"},
        {"requestedRole": "unknown-role"},
    ),
)
def test_self_request_validates_directory_scope_and_public_roles(
    onboarding_client: TestClient,
    overrides: dict[str, str],
):
    assert submit(onboarding_client, **overrides).status_code == 422


def test_pending_user_sees_only_own_status_and_cannot_read_operations(
    onboarding_client: TestClient,
):
    assert submit(onboarding_client).status_code == 200
    assert submit(onboarding_client, token="second-requester-token").status_code == 200

    status_response = onboarding_client.get(
        "/api/v1/account/access-status",
        headers=auth("requester-token"),
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "pending"
    assert status_response.json()["request"]["verifiedEmail"] == "requester@example.com"
    assert "second@example.com" not in status_response.text
    assert (
        onboarding_client.get(
            "/api/v1/organizations/demo-organization/locations/"
            "demo-main-dining/snapshot",
            headers=auth("requester-token"),
        ).status_code
        == 403
    )
    assert (
        onboarding_client.get(
            "/api/v1/access-requests",
            headers=auth("requester-token"),
        ).status_code
        == 403
    )


def test_existing_active_user_needs_no_request_and_cannot_downgrade(
    onboarding_client: TestClient,
):
    status_response = onboarding_client.get(
        "/api/v1/account/access-status",
        headers=auth("supervisor-token"),
    )
    assert status_response.json() == {"status": "active", "request": None}
    assert submit(onboarding_client, token="supervisor-token").status_code == 409


def test_supervisor_lists_only_own_organization_requests(
    onboarding_client: TestClient,
):
    assert submit(onboarding_client).status_code == 200
    assert (
        submit(
            onboarding_client,
            token="second-requester-token",
            organizationId="other-organization",
            locationId="other-location",
        ).status_code
        == 200
    )
    response = onboarding_client.get(
        "/api/v1/access-requests",
        headers=auth("supervisor-token"),
    )
    assert response.status_code == 200
    assert [item["verifiedEmail"] for item in response.json()["requests"]] == [
        "requester@example.com"
    ]
    assert all(
        item["organizationId"] == "demo-organization"
        for item in response.json()["locations"]
    )
    admin_response = onboarding_client.get(
        "/api/v1/access-requests",
        headers=auth("admin-token"),
    )
    assert admin_response.status_code == 200
    assert [item["verifiedEmail"] for item in admin_response.json()["requests"]] == [
        "requester@example.com"
    ]


@pytest.mark.parametrize("role", ("utility-worker", "technician"))
def test_supervisor_approval_activates_profile_and_scoped_membership(
    onboarding_client: TestClient,
    seeded_database: DatabaseFixture,
    role: str,
):
    request_id = submit(onboarding_client).json()["id"]
    response = approve(onboarding_client, request_id, role=role)
    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    with seeded_database.session_factory() as session:
        profile = session.get(UserProfileRecord, REQUESTER_ID)
        membership = session.get(
            OrganizationMembershipRecord,
            (REQUESTER_ID, "demo-organization"),
        )
        assignment = session.get(
            LocationAssignmentRecord,
            (REQUESTER_ID, "demo-organization", "demo-main-dining"),
        )
    assert profile is not None and profile.is_active
    assert membership is not None and membership.role == role
    assert assignment is not None


def test_supervisor_cannot_elevate_or_cross_organizations(
    onboarding_client: TestClient,
):
    request_id = submit(onboarding_client).json()["id"]
    assert (
        approve(
            onboarding_client,
            request_id,
            role="supervisor-manager",
        ).status_code
        == 403
    )
    other_request_id = submit(
        onboarding_client,
        token="second-requester-token",
        organizationId="other-organization",
        locationId="other-location",
    ).json()["id"]
    assert approve(onboarding_client, other_request_id).status_code == 403
    assert (
        approve(onboarding_client, request_id, role="organization-admin").status_code
        == 422
    )


@pytest.mark.parametrize(
    ("role", "expects_assignment"),
    (
        ("utility-worker", True),
        ("technician", True),
        ("supervisor-manager", False),
    ),
)
def test_organization_admin_approves_supported_roles(
    onboarding_client: TestClient,
    seeded_database: DatabaseFixture,
    role: str,
    expects_assignment: bool,
):
    request_id = submit(
        onboarding_client,
        requestedRole=role,
    ).json()["id"]
    response = approve(
        onboarding_client,
        request_id,
        token="admin-token",
        role=role,
    )
    assert response.status_code == 200
    assert (response.json()["approvedLocationId"] is not None) == expects_assignment
    with seeded_database.session_factory() as session:
        membership = session.get(
            OrganizationMembershipRecord,
            (REQUESTER_ID, "demo-organization"),
        )
        assignments = tuple(
            session.scalars(
                select(LocationAssignmentRecord).where(
                    LocationAssignmentRecord.auth_user_id == REQUESTER_ID
                )
            )
        )
    assert membership is not None and membership.role == role
    assert bool(assignments) == expects_assignment


def test_organization_admin_cannot_cross_organizations(
    onboarding_client: TestClient,
):
    request_id = submit(
        onboarding_client,
        token="second-requester-token",
        organizationId="other-organization",
        locationId="other-location",
    ).json()["id"]
    assert (
        approve(
            onboarding_client,
            request_id,
            token="admin-token",
        ).status_code
        == 403
    )


def test_rejection_creates_no_access_and_rejected_user_can_resubmit(
    onboarding_client: TestClient,
    seeded_database: DatabaseFixture,
):
    request_id = submit(onboarding_client).json()["id"]
    response = onboarding_client.post(
        f"/api/v1/access-requests/{request_id}/reject",
        headers=auth("supervisor-token"),
        json={"reviewNote": "Assignment could not be verified."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    status_response = onboarding_client.get(
        "/api/v1/account/access-status",
        headers=auth("requester-token"),
    )
    assert status_response.json()["status"] == "rejected"

    with seeded_database.session_factory() as session:
        assert not session.get(UserProfileRecord, REQUESTER_ID).is_active
        assert session.get(
            OrganizationMembershipRecord,
            (REQUESTER_ID, "demo-organization"),
        ) is None
        assert not tuple(
            session.scalars(
                select(LocationAssignmentRecord).where(
                    LocationAssignmentRecord.auth_user_id == REQUESTER_ID
                )
            )
        )
    resubmission = submit(
        onboarding_client,
        locationId="demo-secondary-dining",
        requestedRole="technician",
    )
    assert resubmission.status_code == 200
    assert resubmission.json()["id"] == request_id
    assert resubmission.json()["status"] == "pending"
    assert resubmission.json()["reviewNote"] is None


@pytest.mark.parametrize(
    ("reviewer_id", "token", "request_id"),
    (
        (
            SUPERVISOR_ID,
            "supervisor-token",
            UUID("00000000-0000-0000-0000-000000000299"),
        ),
        (
            ADMIN_ID,
            "admin-token",
            UUID("00000000-0000-0000-0000-000000000298"),
        ),
    ),
)
def test_reviewers_cannot_approve_themselves(
    onboarding_client: TestClient,
    seeded_database: DatabaseFixture,
    reviewer_id: UUID,
    token: str,
    request_id: UUID,
):
    now = datetime(2026, 8, 10, tzinfo=UTC)
    with seeded_database.session_factory.begin() as session:
        session.add(
            AccessRequestRecord(
                id=request_id,
                auth_user_id=reviewer_id,
                verified_email="reviewer@example.com",
                full_name="Reviewer",
                requested_organization_id="demo-organization",
                requested_location_id="demo-main-dining",
                requested_role="utility-worker",
                status="pending",
                approved_role=None,
                approved_location_id=None,
                reviewed_by_auth_user_id=None,
                reviewed_at=None,
                review_note=None,
                created_at=now,
                updated_at=now,
            )
        )
    assert (
        approve(
            onboarding_client,
            str(request_id),
            token=token,
        ).status_code
        == 403
    )


def test_approval_failure_rolls_back_partial_access_changes(
    onboarding_client: TestClient,
    seeded_database: DatabaseFixture,
    onboarding_services: tuple[AccessRequestService, HumanAuthorizationService],
    monkeypatch: pytest.MonkeyPatch,
):
    access_service, auth_service = onboarding_services
    request_id = UUID(submit(onboarding_client).json()["id"])
    reviewer = auth_service.resolve_account("supervisor-token")

    def fail_after_profile_update(session, _reviewer, request, *_args):
        profile = session.get(UserProfileRecord, request.auth_user_id)
        profile.is_active = True
        session.flush()
        raise RuntimeError("simulated approval failure")

    monkeypatch.setattr(access_service, "_apply_approval", fail_after_profile_update)
    with pytest.raises(RuntimeError, match="simulated approval failure"):
        access_service.approve_request(
            reviewer,
            request_id,
            approved_role="utility-worker",
            approved_location_id="demo-main-dining",
        )

    with seeded_database.session_factory() as session:
        assert not session.get(UserProfileRecord, REQUESTER_ID).is_active
        assert session.get(
            OrganizationMembershipRecord,
            (REQUESTER_ID, "demo-organization"),
        ) is None
        assert session.get(AccessRequestRecord, request_id).status == "pending"
