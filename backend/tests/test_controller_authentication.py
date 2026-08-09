from io import BytesIO
import json
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db.engine import create_database_engine, create_session_factory
from app.db.models import ControllerCredentialRecord, TelemetryReadingRecord
from app.scripts import issue_dev_controller_credential, send_simulated_reading
from app.security.controller_tokens import (
    CONTROLLER_TOKEN_PREFIX,
    digest_controller_token,
    generate_controller_token,
)
from app.services.controller_authentication_service import (
    ControllerAuthenticationService,
    ControllerCredentialIssuanceService,
    ControllerCredentialScopeNotFoundError,
    InvalidControllerCredentialError,
    IssuedControllerCredential,
)
from app.services.telemetry_ingestion_service import TelemetryIngestionService
from tests.conftest import DatabaseFixture
from tests.test_ingestion import INGESTION_URL, VALID_BODY, reading_count


CONTROLLER_ARGUMENTS = [
    "--organization-id",
    "demo-organization",
    "--location-id",
    "demo-main-dining",
    "--controller-id",
    "demo-main-controller-01",
]


def credential_count(database: DatabaseFixture) -> int:
    with database.session_factory() as session:
        return (
            session.scalar(
                select(func.count()).select_from(ControllerCredentialRecord)
            )
            or 0
        )


def test_controller_tokens_are_random_prefixed_and_sha256_digested() -> None:
    first = generate_controller_token()
    second = generate_controller_token()

    assert first.startswith(CONTROLLER_TOKEN_PREFIX)
    assert second.startswith(CONTROLLER_TOKEN_PREFIX)
    assert first != second
    assert len(first.removeprefix(CONTROLLER_TOKEN_PREFIX)) >= 43
    assert len(digest_controller_token(first)) == 64


def test_issuance_persists_only_scoped_token_digest(
    seeded_database: DatabaseFixture,
) -> None:
    issued = ControllerCredentialIssuanceService(
        seeded_database.session_factory
    ).issue(
        organization_id="demo-organization",
        location_id="demo-main-dining",
        controller_id="demo-main-controller-01",
        credential_id="credential-persistence-test",
    )

    with seeded_database.session_factory() as session:
        record = session.get(
            ControllerCredentialRecord,
            "credential-persistence-test",
        )
        assert record is not None
        assert record.organization_id == "demo-organization"
        assert record.location_id == "demo-main-dining"
        assert record.controller_id == "demo-main-controller-01"
        assert record.token_sha256 == digest_controller_token(issued.token)
        assert record.token_sha256 != issued.token
        assert len(record.token_sha256) == 64
        assert record.created_at is not None
        assert issued.token not in {
            str(getattr(record, column.name))
            for column in ControllerCredentialRecord.__table__.columns
        }


def test_multiple_credentials_are_allowed_for_one_controller(
    seeded_database: DatabaseFixture,
) -> None:
    service = ControllerCredentialIssuanceService(
        seeded_database.session_factory
    )
    for credential_id in ("credential-one", "credential-two"):
        service.issue(
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="demo-main-controller-01",
            credential_id=credential_id,
        )

    assert credential_count(seeded_database) == 2


def test_unknown_controller_credential_issuance_creates_nothing(
    seeded_database: DatabaseFixture,
) -> None:
    service = ControllerCredentialIssuanceService(
        seeded_database.session_factory
    )

    with pytest.raises(ControllerCredentialScopeNotFoundError):
        service.issue(
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="unknown-controller",
        )

    assert credential_count(seeded_database) == 0


def test_database_rejects_nonexistent_controller_credential(
    seeded_database: DatabaseFixture,
) -> None:
    with seeded_database.session_factory() as session:
        session.add(
            ControllerCredentialRecord(
                id="invalid-controller-credential",
                organization_id="demo-organization",
                location_id="demo-main-dining",
                controller_id="unknown-controller",
                token_sha256=digest_controller_token(
                    generate_controller_token()
                ),
                created_at=datetime.now(UTC),
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()


def test_database_rejects_duplicate_token_digest(
    seeded_database: DatabaseFixture,
) -> None:
    token_digest = digest_controller_token(generate_controller_token())
    with seeded_database.session_factory() as session:
        session.add_all(
            ControllerCredentialRecord(
                id=credential_id,
                organization_id="demo-organization",
                location_id="demo-main-dining",
                controller_id="demo-main-controller-01",
                token_sha256=token_digest,
                created_at=datetime.now(UTC),
            )
            for credential_id in ("duplicate-one", "duplicate-two")
        )
        with pytest.raises(IntegrityError):
            session.commit()


def test_authentication_is_bound_to_exact_controller_scope(
    seeded_database: DatabaseFixture,
    main_controller_credential: IssuedControllerCredential,
) -> None:
    service = ControllerAuthenticationService()
    with seeded_database.session_factory() as session:
        identity = service.authenticate(
            session,
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="demo-main-controller-01",
            token=main_controller_credential.token,
        )
        assert identity.credential_id == "test-main-credential"

        with pytest.raises(InvalidControllerCredentialError):
            service.authenticate(
                session,
                organization_id="demo-organization",
                location_id="demo-secondary-dining",
                controller_id="demo-secondary-controller-01",
                token=main_controller_credential.token,
            )


@pytest.mark.parametrize(
    "authorization",
    ("", "Basic whatever", "random header text", "Bearer "),
)
def test_missing_or_malformed_authorization_returns_401(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
    authorization: str,
) -> None:
    response = ingestion_client.put(
        INGESTION_URL,
        json=VALID_BODY,
        headers={"Authorization": authorization},
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "Invalid controller credential."}
    assert reading_count(seeded_database) == 9


def test_wrong_bearer_token_returns_401(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    response = ingestion_client.put(
        INGESTION_URL,
        json=VALID_BODY,
        headers={"Authorization": f"Bearer {generate_controller_token()}"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid controller credential."}
    assert reading_count(seeded_database) == 9


def test_main_token_cannot_authenticate_secondary_controller(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    secondary_url = (
        "/api/v1/organizations/demo-organization/locations/demo-secondary-dining"
        "/controllers/demo-secondary-controller-01/readings/auth-scope-test"
    )
    response = ingestion_client.put(
        secondary_url,
        json={**VALID_BODY, "trayId": "demo-secondary-tray-01"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid controller credential."}
    assert reading_count(seeded_database) == 9


def test_secondary_token_cannot_authenticate_main_controller(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    secondary = ControllerCredentialIssuanceService(
        seeded_database.session_factory
    ).issue(
        organization_id="demo-organization",
        location_id="demo-secondary-dining",
        controller_id="demo-secondary-controller-01",
        credential_id="secondary-controller-credential",
    )

    response = ingestion_client.put(
        INGESTION_URL,
        json=VALID_BODY,
        headers={"Authorization": f"Bearer {secondary.token}"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid controller credential."}
    assert reading_count(seeded_database) == 9


def test_main_token_cannot_authenticate_wrong_location_path(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    response = ingestion_client.put(
        INGESTION_URL.replace("demo-main-dining", "demo-secondary-dining"),
        json=VALID_BODY,
    )

    assert response.status_code == 401
    assert reading_count(seeded_database) == 9


def test_authenticated_controller_wrong_tray_returns_404(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    response = ingestion_client.put(
        INGESTION_URL,
        json={**VALID_BODY, "trayId": "demo-secondary-tray-01"},
    )

    assert response.status_code == 404
    assert reading_count(seeded_database) == 9


def test_credential_and_reading_survive_engine_recreation(
    seeded_database: DatabaseFixture,
    main_controller_credential: IssuedControllerCredential,
) -> None:
    TelemetryIngestionService(
        session_factory=seeded_database.session_factory,
        enabled=True,
    ).ingest(
        organization_id="demo-organization",
        location_id="demo-main-dining",
        controller_id="demo-main-controller-01",
        reading_id="authentication-restart-reading",
        controller_token=main_controller_credential.token,
        tray_id="demo-main-tray-01",
        timestamp=datetime(2026, 8, 9, 18, 0, tzinfo=UTC),
        gross_weight_grams=10900.0,
    )
    seeded_database.engine.dispose()

    recreated_engine = create_database_engine(seeded_database.url)
    session_factory = create_session_factory(recreated_engine)
    with session_factory() as session:
        identity = ControllerAuthenticationService().authenticate(
            session,
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="demo-main-controller-01",
            token=main_controller_credential.token,
        )
        assert identity.credential_id == "test-main-credential"
        assert session.get(
            TelemetryReadingRecord,
            "authentication-restart-reading",
        ) is not None
    recreated_engine.dispose()


def test_issuance_cli_print_token_only_contract(
    seeded_database: DatabaseFixture,
    capsys,
) -> None:
    result = issue_dev_controller_credential.main(
        [*CONTROLLER_ARGUMENTS, "--print-token-only"],
        seeded_database.session_factory,
    )
    output = capsys.readouterr()
    token = output.out.strip()

    assert result == 0
    assert token.startswith(CONTROLLER_TOKEN_PREFIX)
    assert "credentialId=" not in output.out
    assert output.err == ""
    with seeded_database.session_factory() as session:
        record = session.scalar(select(ControllerCredentialRecord))
        assert record is not None
        assert record.token_sha256 == digest_controller_token(token)


def test_issuance_cli_unknown_controller_exits_nonzero(
    seeded_database: DatabaseFixture,
    capsys,
) -> None:
    result = issue_dev_controller_credential.main(
        [
            "--organization-id",
            "demo-organization",
            "--location-id",
            "demo-main-dining",
            "--controller-id",
            "unknown-controller",
            "--print-token-only",
        ],
        seeded_database.session_factory,
    )

    assert result == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert "not found" in output.err
    assert credential_count(seeded_database) == 0


def test_simulated_sender_requires_environment_token(
    monkeypatch,
    capsys,
) -> None:
    monkeypatch.delenv("BIB_CONTROLLER_TOKEN", raising=False)
    monkeypatch.setattr(
        send_simulated_reading,
        "urlopen",
        lambda *_args, **_kwargs: pytest.fail("HTTP request should not run"),
    )

    result = send_simulated_reading.main(
        [
            *CONTROLLER_ARGUMENTS,
            "--tray-id",
            "demo-main-tray-01",
            "--reading-id",
            "sender-test-reading",
            "--timestamp",
            "2026-08-09T18:00:00Z",
            "--gross-weight-grams",
            "10900",
        ]
    )

    assert result == 1
    assert "BIB_CONTROLLER_TOKEN" in capsys.readouterr().out


def test_simulated_sender_uses_bearer_header_without_leaking_token(
    monkeypatch,
    capsys,
) -> None:
    token = generate_controller_token()
    monkeypatch.setenv("BIB_CONTROLLER_TOKEN", token)
    captured_request = None

    class FakeResponse(BytesIO):
        status = 201

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            self.close()

    def fake_urlopen(request, timeout):
        nonlocal captured_request
        captured_request = request
        assert timeout == 5
        return FakeResponse(b'{"readingId":"sender-test","result":"created"}')

    monkeypatch.setattr(send_simulated_reading, "urlopen", fake_urlopen)
    result = send_simulated_reading.main(
        [
            *CONTROLLER_ARGUMENTS,
            "--tray-id",
            "demo-main-tray-01",
            "--reading-id",
            "sender-test",
            "--timestamp",
            "2026-08-09T18:00:00Z",
            "--gross-weight-grams",
            "10900",
        ]
    )
    output = capsys.readouterr().out

    assert result == 0
    assert captured_request is not None
    assert captured_request.get_header("Authorization") == f"Bearer {token}"
    assert token not in captured_request.full_url
    assert token not in captured_request.data.decode()
    assert token not in output
    assert "result=created" in output
