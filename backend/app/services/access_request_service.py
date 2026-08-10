from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.engine import SessionFactory
from app.db.models import (
    AccessRequestRecord,
    LocationAssignmentRecord,
    LocationRecord,
    OrganizationMembershipRecord,
    OrganizationRecord,
    UserProfileRecord,
)
from app.security.human_tokens import AuthenticatedHuman
from app.services.human_authorization_service import AuthorizedHumanAccount


RequestedRole = Literal[
    "utility-worker",
    "supervisor-manager",
    "technician",
]
AccessRequestStatus = Literal["pending", "approved", "rejected"]
SELF_SERVICE_ROLES = frozenset(
    {"utility-worker", "supervisor-manager", "technician"}
)


class AccessRequestValidationError(Exception):
    pass


class AccessRequestConflictError(Exception):
    pass


class AccessRequestForbiddenError(Exception):
    pass


class AccessRequestNotFoundError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class SignupOrganization:
    id: str
    name: str


@dataclass(frozen=True, slots=True)
class SignupLocation:
    id: str
    organization_id: str
    name: str


@dataclass(frozen=True, slots=True)
class AccessRequestView:
    id: UUID
    auth_user_id: UUID
    verified_email: str
    full_name: str
    requested_organization_id: str
    requested_organization_name: str
    requested_location_id: str
    requested_location_name: str
    requested_role: RequestedRole
    status: AccessRequestStatus
    approved_role: RequestedRole | None
    approved_location_id: str | None
    approved_location_name: str | None
    review_note: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class AccessStatusView:
    status: Literal["active", "pending", "rejected", "no-request"]
    request: AccessRequestView | None


class AccessRequestService:
    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def get_signup_options(
        self,
    ) -> tuple[tuple[SignupOrganization, ...], tuple[SignupLocation, ...]]:
        with self._session_factory() as session:
            organizations = tuple(
                SignupOrganization(record.id, record.name)
                for record in session.scalars(
                    select(OrganizationRecord).order_by(OrganizationRecord.name)
                )
            )
            locations = tuple(
                SignupLocation(
                    record.id,
                    record.organization_id,
                    record.name,
                )
                for record in session.scalars(
                    select(LocationRecord).order_by(
                        LocationRecord.organization_id,
                        LocationRecord.name,
                    )
                )
            )
        return organizations, locations

    def get_access_status(
        self,
        identity: AuthenticatedHuman,
    ) -> AccessStatusView:
        with self._session_factory() as session:
            profile = session.get(UserProfileRecord, identity.auth_user_id)
            active_membership = session.scalar(
                select(OrganizationMembershipRecord).where(
                    OrganizationMembershipRecord.auth_user_id
                    == identity.auth_user_id,
                    OrganizationMembershipRecord.is_active.is_(True),
                )
            )
            if profile is not None and profile.is_active and active_membership:
                return AccessStatusView("active", None)

            request = session.scalar(
                select(AccessRequestRecord).where(
                    AccessRequestRecord.auth_user_id == identity.auth_user_id
                )
            )
            if request is None:
                return AccessStatusView("no-request", None)
            return AccessStatusView(
                "pending" if request.status == "pending" else "rejected",
                self._to_view(session, request),
            )

    def submit_request(
        self,
        identity: AuthenticatedHuman,
        *,
        full_name: str,
        organization_id: str,
        location_id: str,
        requested_role: str,
    ) -> AccessRequestView:
        if identity.verified_email is None:
            raise AccessRequestValidationError(
                "A verified work email is required."
            )
        full_name = full_name.strip()
        if not 2 <= len(full_name) <= 255:
            raise AccessRequestValidationError(
                "Full name must contain between 2 and 255 characters."
            )
        if requested_role not in SELF_SERVICE_ROLES:
            raise AccessRequestValidationError("Requested role is not allowed.")

        now = datetime.now(UTC)
        with self._session_factory.begin() as session:
            self._require_location(session, organization_id, location_id)
            profile = session.get(UserProfileRecord, identity.auth_user_id)
            active_membership = session.scalar(
                select(OrganizationMembershipRecord).where(
                    OrganizationMembershipRecord.auth_user_id
                    == identity.auth_user_id,
                    OrganizationMembershipRecord.is_active.is_(True),
                )
            )
            if active_membership or (profile is not None and profile.is_active):
                raise AccessRequestConflictError(
                    "An active BevSense account cannot submit an access request."
                )
            if profile is None:
                profile = UserProfileRecord(
                    auth_user_id=identity.auth_user_id,
                    display_name=full_name,
                    preferred_language="en",
                    is_active=False,
                    created_at=now,
                    updated_at=now,
                )
                session.add(profile)
                session.flush()
            else:
                profile.display_name = full_name
                profile.is_active = False
                profile.updated_at = now

            request = session.scalar(
                select(AccessRequestRecord).where(
                    AccessRequestRecord.auth_user_id == identity.auth_user_id
                )
            )
            if request is not None and request.status == "approved":
                raise AccessRequestConflictError(
                    "An approved access request cannot be resubmitted."
                )
            if request is None:
                request = AccessRequestRecord(
                    id=uuid4(),
                    auth_user_id=identity.auth_user_id,
                    verified_email=identity.verified_email,
                    full_name=full_name,
                    requested_organization_id=organization_id,
                    requested_location_id=location_id,
                    requested_role=requested_role,
                    status="pending",
                    approved_role=None,
                    approved_location_id=None,
                    reviewed_by_auth_user_id=None,
                    reviewed_at=None,
                    review_note=None,
                    created_at=now,
                    updated_at=now,
                )
                session.add(request)
            else:
                request.verified_email = identity.verified_email
                request.full_name = full_name
                request.requested_organization_id = organization_id
                request.requested_location_id = location_id
                request.requested_role = requested_role
                request.status = "pending"
                request.approved_role = None
                request.approved_location_id = None
                request.reviewed_by_auth_user_id = None
                request.reviewed_at = None
                request.review_note = None
                request.updated_at = now
            session.flush()
            view = self._to_view(session, request)
        return view

    def list_requests(
        self,
        reviewer: AuthorizedHumanAccount,
        status: AccessRequestStatus = "pending",
    ) -> tuple[AccessRequestView, ...]:
        organization_ids = tuple(
            membership.organization_id
            for membership in reviewer.memberships
            if membership.role in {"supervisor-manager", "organization-admin"}
        )
        if not organization_ids:
            raise AccessRequestForbiddenError("Access is not permitted.")
        with self._session_factory() as session:
            requests = tuple(
                session.scalars(
                    select(AccessRequestRecord)
                    .where(
                        AccessRequestRecord.status == status,
                        AccessRequestRecord.requested_organization_id.in_(
                            organization_ids
                        ),
                    )
                    .order_by(AccessRequestRecord.created_at)
                )
            )
            return tuple(self._to_view(session, request) for request in requests)

    def approve_request(
        self,
        reviewer: AuthorizedHumanAccount,
        request_id: UUID,
        *,
        approved_role: str,
        approved_location_id: str | None,
    ) -> AccessRequestView:
        if approved_role not in SELF_SERVICE_ROLES:
            raise AccessRequestValidationError("Approved role is not allowed.")
        with self._session_factory.begin() as session:
            request = self._get_request_for_update(session, request_id)
            reviewer_role = self._reviewer_role(
                reviewer,
                request.requested_organization_id,
            )
            if request.auth_user_id == reviewer.auth_user_id:
                raise AccessRequestForbiddenError("Self-approval is not permitted.")
            if reviewer_role == "supervisor-manager" and approved_role not in {
                "utility-worker",
                "technician",
            }:
                raise AccessRequestForbiddenError("Access is not permitted.")
            if request.status != "pending":
                raise AccessRequestConflictError(
                    "Only pending access requests can be approved."
                )

            final_location_id = None
            if approved_role in {"utility-worker", "technician"}:
                if not approved_location_id:
                    raise AccessRequestValidationError(
                        "A final workplace is required for this role."
                    )
                self._require_location(
                    session,
                    request.requested_organization_id,
                    approved_location_id,
                )
                final_location_id = approved_location_id

            now = datetime.now(UTC)
            self._apply_approval(
                session,
                reviewer,
                request,
                approved_role,
                final_location_id,
                now,
            )
            session.flush()
            view = self._to_view(session, request)
        return view

    def reject_request(
        self,
        reviewer: AuthorizedHumanAccount,
        request_id: UUID,
        review_note: str | None,
    ) -> AccessRequestView:
        with self._session_factory.begin() as session:
            request = self._get_request_for_update(session, request_id)
            self._reviewer_role(reviewer, request.requested_organization_id)
            if request.auth_user_id == reviewer.auth_user_id:
                raise AccessRequestForbiddenError("Self-review is not permitted.")
            if request.status != "pending":
                raise AccessRequestConflictError(
                    "Only pending access requests can be rejected."
                )
            now = datetime.now(UTC)
            request.status = "rejected"
            request.approved_role = None
            request.approved_location_id = None
            request.reviewed_by_auth_user_id = reviewer.auth_user_id
            request.reviewed_at = now
            request.review_note = review_note.strip() if review_note else None
            request.updated_at = now
            session.flush()
            view = self._to_view(session, request)
        return view

    def _apply_approval(
        self,
        session: Session,
        reviewer: AuthorizedHumanAccount,
        request: AccessRequestRecord,
        approved_role: str,
        approved_location_id: str | None,
        now: datetime,
    ) -> None:
        profile = session.get(UserProfileRecord, request.auth_user_id)
        if profile is None:
            raise AccessRequestConflictError("The requester profile is unavailable.")
        profile.display_name = request.full_name
        profile.is_active = True
        profile.updated_at = now

        membership = session.get(
            OrganizationMembershipRecord,
            (request.auth_user_id, request.requested_organization_id),
        )
        if membership is None:
            membership = OrganizationMembershipRecord(
                auth_user_id=request.auth_user_id,
                organization_id=request.requested_organization_id,
                role=approved_role,
                is_active=True,
                created_at=now,
            )
            session.add(membership)
        else:
            membership.role = approved_role
            membership.is_active = True
        session.flush()

        session.execute(
            delete(LocationAssignmentRecord).where(
                LocationAssignmentRecord.auth_user_id == request.auth_user_id,
                LocationAssignmentRecord.organization_id
                == request.requested_organization_id,
            )
        )
        if approved_location_id is not None:
            session.add(
                LocationAssignmentRecord(
                    auth_user_id=request.auth_user_id,
                    organization_id=request.requested_organization_id,
                    location_id=approved_location_id,
                    created_at=now,
                )
            )

        request.status = "approved"
        request.approved_role = approved_role
        request.approved_location_id = approved_location_id
        request.reviewed_by_auth_user_id = reviewer.auth_user_id
        request.reviewed_at = now
        request.review_note = None
        request.updated_at = now

    @staticmethod
    def _reviewer_role(
        reviewer: AuthorizedHumanAccount,
        organization_id: str,
    ) -> str:
        membership = next(
            (
                membership
                for membership in reviewer.memberships
                if membership.organization_id == organization_id
                and membership.role
                in {"supervisor-manager", "organization-admin"}
            ),
            None,
        )
        if membership is None:
            raise AccessRequestForbiddenError("Access is not permitted.")
        return membership.role

    @staticmethod
    def _require_location(
        session: Session,
        organization_id: str,
        location_id: str,
    ) -> LocationRecord:
        location = session.get(LocationRecord, location_id)
        if location is None or location.organization_id != organization_id:
            raise AccessRequestValidationError(
                "The selected organization and workplace are invalid."
            )
        return location

    @staticmethod
    def _get_request_for_update(
        session: Session,
        request_id: UUID,
    ) -> AccessRequestRecord:
        request = session.scalar(
            select(AccessRequestRecord)
            .where(AccessRequestRecord.id == request_id)
            .with_for_update()
        )
        if request is None:
            raise AccessRequestNotFoundError("Access request was not found.")
        return request

    @staticmethod
    def _to_view(
        session: Session,
        request: AccessRequestRecord,
    ) -> AccessRequestView:
        organization = session.get(
            OrganizationRecord,
            request.requested_organization_id,
        )
        requested_location = session.get(
            LocationRecord,
            request.requested_location_id,
        )
        approved_location = (
            session.get(LocationRecord, request.approved_location_id)
            if request.approved_location_id
            else None
        )
        if organization is None or requested_location is None:
            raise AccessRequestConflictError(
                "Access request directory data is unavailable."
            )
        return AccessRequestView(
            id=request.id,
            auth_user_id=request.auth_user_id,
            verified_email=request.verified_email,
            full_name=request.full_name,
            requested_organization_id=request.requested_organization_id,
            requested_organization_name=organization.name,
            requested_location_id=request.requested_location_id,
            requested_location_name=requested_location.name,
            requested_role=request.requested_role,
            status=request.status,
            approved_role=request.approved_role,
            approved_location_id=request.approved_location_id,
            approved_location_name=(
                approved_location.name if approved_location else None
            ),
            review_note=request.review_note,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )
