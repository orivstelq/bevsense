from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from app.db.engine import SessionFactory
from app.db.human_access_repository import HumanAccessRepository
from app.security.human_tokens import AuthenticatedHuman, HumanTokenVerifier


AuthenticatedRole = Literal[
    "utility-worker",
    "supervisor-manager",
    "organization-admin",
    "technician",
]


class HumanAccessForbiddenError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AuthorizedHumanAccess:
    auth_user_id: UUID
    display_name: str
    preferred_language: Literal["en", "es"]
    organization_id: str
    location_id: str
    role: AuthenticatedRole


@dataclass(frozen=True, slots=True)
class AuthorizedMembership:
    organization_id: str
    role: AuthenticatedRole
    location_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class AuthorizedHumanAccount:
    auth_user_id: UUID
    display_name: str
    preferred_language: Literal["en", "es"]
    memberships: tuple[AuthorizedMembership, ...]


class HumanAuthorizationService:
    def __init__(
        self,
        session_factory: SessionFactory,
        token_verifier: HumanTokenVerifier,
        repository: HumanAccessRepository | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._token_verifier = token_verifier
        self._repository = repository or HumanAccessRepository()

    def authenticate_identity(self, token: str) -> AuthenticatedHuman:
        return self._token_verifier.verify(token)

    def authorize_snapshot(
        self,
        token: str,
        organization_id: str,
        location_id: str,
    ) -> AuthorizedHumanAccess:
        identity = self._token_verifier.verify(token)
        with self._session_factory() as session:
            records = self._repository.get_access_records(
                session,
                identity.auth_user_id,
                organization_id,
                location_id,
            )

        profile = records.profile
        membership = records.membership
        if profile is None or not profile.is_active:
            raise HumanAccessForbiddenError("Access is not permitted.")
        if membership is None or not membership.is_active:
            raise HumanAccessForbiddenError("Access is not permitted.")

        role = membership.role
        if role not in {
            "utility-worker",
            "supervisor-manager",
            "organization-admin",
            "technician",
        }:
            raise HumanAccessForbiddenError("Access is not permitted.")
        if role in {"utility-worker", "technician"} and not records.assigned_to_location:
            raise HumanAccessForbiddenError("Access is not permitted.")

        return AuthorizedHumanAccess(
            auth_user_id=identity.auth_user_id,
            display_name=profile.display_name,
            preferred_language=profile.preferred_language,
            organization_id=organization_id,
            location_id=location_id,
            role=role,
        )

    def resolve_account(self, token: str) -> AuthorizedHumanAccount:
        identity = self._token_verifier.verify(token)
        with self._session_factory() as session:
            records = self._repository.get_account_records(
                session, identity.auth_user_id
            )

        profile = records.profile
        if profile is None or not profile.is_active:
            raise HumanAccessForbiddenError("Access is not permitted.")
        active_memberships = tuple(
            membership
            for membership in records.memberships
            if membership.is_active
            and membership.role
            in {
                "utility-worker",
                "supervisor-manager",
                "organization-admin",
                "technician",
            }
        )
        if not active_memberships:
            raise HumanAccessForbiddenError("Access is not permitted.")

        return AuthorizedHumanAccount(
            auth_user_id=identity.auth_user_id,
            display_name=profile.display_name,
            preferred_language=profile.preferred_language,
            memberships=tuple(
                AuthorizedMembership(
                    organization_id=membership.organization_id,
                    role=membership.role,
                    location_ids=tuple(
                        assignment.location_id
                        for assignment in records.assignments
                        if assignment.organization_id
                        == membership.organization_id
                    ),
                )
                for membership in active_memberships
            ),
        )
