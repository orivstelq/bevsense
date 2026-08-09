from dataclasses import dataclass, field
from datetime import UTC, datetime
from secrets import compare_digest
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.credential_repository import ControllerCredentialRepository
from app.db.engine import SessionFactory
from app.db.models import ControllerCredentialRecord
from app.security.controller_tokens import (
    digest_controller_token,
    generate_controller_token,
)


class InvalidControllerCredentialError(RuntimeError):
    pass


class ControllerCredentialScopeNotFoundError(LookupError):
    pass


@dataclass(frozen=True, slots=True)
class AuthenticatedController:
    organization_id: str
    location_id: str
    controller_id: str
    credential_id: str


@dataclass(frozen=True, slots=True)
class IssuedControllerCredential:
    identity: AuthenticatedController
    token: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class ControllerAuthenticationService:
    repository: ControllerCredentialRepository = field(
        default_factory=ControllerCredentialRepository
    )

    def authenticate(
        self,
        session: Session,
        *,
        organization_id: str,
        location_id: str,
        controller_id: str,
        token: str,
    ) -> AuthenticatedController:
        candidate_digest = digest_controller_token(token)
        matched_credential_id: str | None = None
        credentials = self.repository.get_controller_credentials(
            session,
            organization_id,
            location_id,
            controller_id,
        )
        for credential in credentials:
            if compare_digest(credential.token_sha256, candidate_digest):
                matched_credential_id = credential.id

        if matched_credential_id is None:
            raise InvalidControllerCredentialError(
                "Invalid controller credential."
            )

        return AuthenticatedController(
            organization_id=organization_id,
            location_id=location_id,
            controller_id=controller_id,
            credential_id=matched_credential_id,
        )


@dataclass(frozen=True, slots=True)
class ControllerCredentialIssuanceService:
    session_factory: SessionFactory
    repository: ControllerCredentialRepository = field(
        default_factory=ControllerCredentialRepository
    )

    def issue(
        self,
        *,
        organization_id: str,
        location_id: str,
        controller_id: str,
        credential_id: str | None = None,
    ) -> IssuedControllerCredential:
        credential_id = credential_id or str(uuid4())
        token = generate_controller_token()
        created_at = datetime.now(UTC)

        with self.session_factory.begin() as session:
            if not self.repository.controller_exists(
                session,
                organization_id,
                location_id,
                controller_id,
            ):
                raise ControllerCredentialScopeNotFoundError(
                    "The requested controller scope was not found."
                )
            self.repository.add_credential(
                session,
                ControllerCredentialRecord(
                    id=credential_id,
                    organization_id=organization_id,
                    location_id=location_id,
                    controller_id=controller_id,
                    token_sha256=digest_controller_token(token),
                    created_at=created_at,
                ),
            )

        return IssuedControllerCredential(
            identity=AuthenticatedController(
                organization_id=organization_id,
                location_id=location_id,
                controller_id=controller_id,
                credential_id=credential_id,
            ),
            token=token,
            created_at=created_at,
        )
