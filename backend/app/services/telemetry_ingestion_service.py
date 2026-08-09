from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy.exc import IntegrityError

from app.db.engine import SessionFactory
from app.db.ingestion_repository import TelemetryIngestionRepository
from app.db.models import TelemetryReadingRecord
from app.services.controller_authentication_service import (
    ControllerAuthenticationService,
    InvalidControllerCredentialError,
)


SIMULATED_DATA_SOURCE: Literal["simulated"] = "simulated"


class TelemetryIngestionDisabledError(RuntimeError):
    pass


class TelemetryIngestionUnavailableError(RuntimeError):
    pass


class TelemetryIngestionScopeNotFoundError(LookupError):
    pass


class TelemetryReadingConflictError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class TelemetryIngestionResult:
    reading_id: str
    organization_id: str
    location_id: str
    controller_id: str
    tray_id: str
    timestamp: datetime
    gross_weight_grams: float
    data_source: Literal["simulated"]
    result: Literal["created", "duplicate"]


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _matches(
    existing: TelemetryReadingRecord,
    candidate: TelemetryReadingRecord,
) -> bool:
    return (
        existing.organization_id == candidate.organization_id
        and existing.location_id == candidate.location_id
        and existing.controller_id == candidate.controller_id
        and existing.tray_id == candidate.tray_id
        and _as_utc(existing.timestamp) == _as_utc(candidate.timestamp)
        and existing.gross_weight_grams == candidate.gross_weight_grams
        and existing.data_source == candidate.data_source
    )


@dataclass(frozen=True, slots=True)
class TelemetryIngestionService:
    session_factory: SessionFactory | None
    enabled: bool
    repository: TelemetryIngestionRepository = field(
        default_factory=TelemetryIngestionRepository
    )
    authentication_service: ControllerAuthenticationService = field(
        default_factory=ControllerAuthenticationService
    )

    def ingest(
        self,
        *,
        organization_id: str,
        location_id: str,
        controller_id: str,
        reading_id: str,
        controller_token: str | None,
        tray_id: str,
        timestamp: datetime,
        gross_weight_grams: float,
    ) -> TelemetryIngestionResult:
        if not self.enabled:
            raise TelemetryIngestionDisabledError(
                "Telemetry ingestion is disabled by server configuration."
            )
        if self.session_factory is None:
            raise TelemetryIngestionUnavailableError(
                "Telemetry ingestion requires the database telemetry provider."
            )
        if not controller_token:
            raise InvalidControllerCredentialError(
                "Invalid controller credential."
            )

        candidate = TelemetryReadingRecord(
            id=reading_id,
            organization_id=organization_id,
            location_id=location_id,
            controller_id=controller_id,
            tray_id=tray_id,
            timestamp=_as_utc(timestamp),
            gross_weight_grams=gross_weight_grams,
            data_source=SIMULATED_DATA_SOURCE,
        )

        try:
            return self._ingest(candidate, controller_token)
        except IntegrityError as error:
            return self._resolve_concurrent_duplicate(candidate, error)

    def _ingest(
        self,
        candidate: TelemetryReadingRecord,
        controller_token: str,
    ) -> TelemetryIngestionResult:
        assert self.session_factory is not None
        with self.session_factory.begin() as session:
            self.authentication_service.authenticate(
                session,
                organization_id=candidate.organization_id,
                location_id=candidate.location_id,
                controller_id=candidate.controller_id,
                token=controller_token,
            )
            if not self.repository.tray_exists(
                session,
                candidate.organization_id,
                candidate.location_id,
                candidate.controller_id,
                candidate.tray_id,
            ):
                raise TelemetryIngestionScopeNotFoundError(
                    "The requested controller and tray scope was not found."
                )

            existing = self.repository.get_reading(session, candidate.id)
            if existing is not None:
                return self._existing_result(existing, candidate)

            self.repository.add_reading(session, candidate)
            return self._result(candidate, "created")

    def _resolve_concurrent_duplicate(
        self,
        candidate: TelemetryReadingRecord,
        integrity_error: IntegrityError,
    ) -> TelemetryIngestionResult:
        assert self.session_factory is not None
        with self.session_factory() as session:
            existing = self.repository.get_reading(session, candidate.id)
            if existing is None:
                raise integrity_error
            return self._existing_result(existing, candidate)

    @staticmethod
    def _existing_result(
        existing: TelemetryReadingRecord,
        candidate: TelemetryReadingRecord,
    ) -> TelemetryIngestionResult:
        if not _matches(existing, candidate):
            raise TelemetryReadingConflictError(
                "The reading ID already exists with different immutable data."
            )
        return TelemetryIngestionService._result(existing, "duplicate")

    @staticmethod
    def _result(
        reading: TelemetryReadingRecord,
        result: Literal["created", "duplicate"],
    ) -> TelemetryIngestionResult:
        return TelemetryIngestionResult(
            reading_id=reading.id,
            organization_id=reading.organization_id,
            location_id=reading.location_id,
            controller_id=reading.controller_id,
            tray_id=reading.tray_id,
            timestamp=_as_utc(reading.timestamp),
            gross_weight_grams=reading.gross_weight_grams,
            data_source=SIMULATED_DATA_SOURCE,
            result=result,
        )
