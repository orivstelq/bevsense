from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from app.db.credential_repository import ControllerCredentialRepository
from app.db.engine import SessionFactory
from app.db.models import ControllerCredentialRecord
from app.services.controller_authentication_service import (
    ControllerCredentialScopeNotFoundError,
)


CredentialStatus = Literal["active", "revoked"]
RevocationResult = Literal["revoked", "already-revoked"]


class ControllerCredentialNotFoundError(LookupError):
    pass


@dataclass(frozen=True, slots=True)
class ControllerCredentialMetadata:
    credential_id: str
    created_at: datetime
    status: CredentialStatus
    revoked_at: datetime | None


@dataclass(frozen=True, slots=True)
class ControllerCredentialList:
    credentials: tuple[ControllerCredentialMetadata, ...]
    total_count: int
    active_count: int
    revoked_count: int


@dataclass(frozen=True, slots=True)
class ControllerCredentialRevocation:
    credential: ControllerCredentialMetadata
    result: RevocationResult
    active_credentials_remaining: int


def _timezone_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _metadata(record: ControllerCredentialRecord) -> ControllerCredentialMetadata:
    revoked_at = (
        _timezone_aware(record.revoked_at)
        if record.revoked_at is not None
        else None
    )
    return ControllerCredentialMetadata(
        credential_id=record.id,
        created_at=_timezone_aware(record.created_at),
        status="revoked" if revoked_at is not None else "active",
        revoked_at=revoked_at,
    )


@dataclass(frozen=True, slots=True)
class ControllerCredentialLifecycleService:
    session_factory: SessionFactory
    repository: ControllerCredentialRepository = field(
        default_factory=ControllerCredentialRepository
    )

    def list_credentials(
        self,
        *,
        organization_id: str,
        location_id: str,
        controller_id: str,
    ) -> ControllerCredentialList:
        with self.session_factory() as session:
            if not self.repository.controller_exists(
                session,
                organization_id,
                location_id,
                controller_id,
            ):
                raise ControllerCredentialScopeNotFoundError(
                    "The requested controller scope was not found."
                )
            records = self.repository.list_controller_credentials(
                session,
                organization_id,
                location_id,
                controller_id,
            )

        credentials = tuple(_metadata(record) for record in records)
        active_count = sum(
            credential.status == "active" for credential in credentials
        )
        return ControllerCredentialList(
            credentials=credentials,
            total_count=len(credentials),
            active_count=active_count,
            revoked_count=len(credentials) - active_count,
        )

    def revoke(
        self,
        *,
        organization_id: str,
        location_id: str,
        controller_id: str,
        credential_id: str,
    ) -> ControllerCredentialRevocation:
        with self.session_factory.begin() as session:
            record = self.repository.get_controller_credential(
                session,
                organization_id,
                location_id,
                controller_id,
                credential_id,
            )
            if record is None:
                raise ControllerCredentialNotFoundError(
                    "The requested controller credential was not found in this scope."
                )

            if record.revoked_at is None:
                self.repository.revoke_credential(record, datetime.now(UTC))
                result: RevocationResult = "revoked"
            else:
                result = "already-revoked"

            records = self.repository.list_controller_credentials(
                session,
                organization_id,
                location_id,
                controller_id,
            )
            active_count = sum(item.revoked_at is None for item in records)
            metadata = _metadata(record)

        return ControllerCredentialRevocation(
            credential=metadata,
            result=result,
            active_credentials_remaining=active_count,
        )
