from dataclasses import fields

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.engine import create_database_engine, create_session_factory
from app.db.models import ControllerCredentialRecord
from app.scripts import (
    list_dev_controller_credentials,
    revoke_dev_controller_credential,
)
from app.security.controller_tokens import digest_controller_token
from app.services.controller_authentication_service import (
    ControllerAuthenticationService,
    ControllerCredentialIssuanceService,
    ControllerCredentialScopeNotFoundError,
    InvalidControllerCredentialError,
)
from app.services.controller_credential_lifecycle_service import (
    ControllerCredentialLifecycleService,
    ControllerCredentialMetadata,
    ControllerCredentialNotFoundError,
)
from tests.conftest import DatabaseFixture
from tests.test_ingestion import INGESTION_URL, VALID_BODY, reading_count


SCOPE = {
    "organization_id": "demo-organization",
    "location_id": "demo-main-dining",
    "controller_id": "demo-main-controller-01",
}
SCOPE_ARGUMENTS = [
    "--organization-id",
    SCOPE["organization_id"],
    "--location-id",
    SCOPE["location_id"],
    "--controller-id",
    SCOPE["controller_id"],
]


def issue(
    database: DatabaseFixture,
    credential_id: str,
):
    return ControllerCredentialIssuanceService(database.session_factory).issue(
        **SCOPE,
        credential_id=credential_id,
    )


def test_staged_rotation_keeps_new_credential_active_and_rejects_revoked_one(
    ingestion_client: TestClient,
    seeded_database: DatabaseFixture,
) -> None:
    old_credential = issue(seeded_database, "rotation-old")
    new_credential = issue(seeded_database, "rotation-new")
    authentication = ControllerAuthenticationService()

    with seeded_database.session_factory() as session:
        for credential in (old_credential, new_credential):
            assert authentication.authenticate(
                session,
                **SCOPE,
                token=credential.token,
            ).credential_id == credential.identity.credential_id

    result = ControllerCredentialLifecycleService(
        seeded_database.session_factory
    ).revoke(**SCOPE, credential_id="rotation-old")
    assert result.result == "revoked"
    assert result.active_credentials_remaining == 2

    old_response = ingestion_client.put(
        INGESTION_URL.replace("phase2f-reading-001", "rotation-old-reading"),
        json=VALID_BODY,
        headers={"Authorization": f"Bearer {old_credential.token}"},
    )
    assert old_response.status_code == 401
    assert old_response.json() == {"detail": "Invalid controller credential."}
    assert reading_count(seeded_database) == 9

    new_response = ingestion_client.put(
        INGESTION_URL.replace("phase2f-reading-001", "rotation-new-reading"),
        json=VALID_BODY,
        headers={"Authorization": f"Bearer {new_credential.token}"},
    )
    assert new_response.status_code == 201
    assert reading_count(seeded_database) == 10


def test_revocation_is_idempotent_and_preserves_original_timestamp(
    seeded_database: DatabaseFixture,
) -> None:
    issue(seeded_database, "idempotent-revocation")
    service = ControllerCredentialLifecycleService(
        seeded_database.session_factory
    )

    first = service.revoke(**SCOPE, credential_id="idempotent-revocation")
    second = service.revoke(**SCOPE, credential_id="idempotent-revocation")

    assert first.result == "revoked"
    assert second.result == "already-revoked"
    assert first.credential.revoked_at == second.credential.revoked_at
    assert first.credential.status == second.credential.status == "revoked"


def test_revoking_last_active_credential_is_allowed_and_warned(
    seeded_database: DatabaseFixture,
    capsys,
) -> None:
    credential = issue(seeded_database, "last-active")

    result = revoke_dev_controller_credential.main(
        [*SCOPE_ARGUMENTS, "--credential-id", "last-active"],
        seeded_database.session_factory,
    )

    output = capsys.readouterr()
    assert result == 0
    assert "result=revoked" in output.out
    assert "activeCredentialsRemaining=0" in output.out
    assert "No active credentials remain" in output.err
    assert credential.token not in output.out + output.err
    assert digest_controller_token(credential.token) not in output.out + output.err
    with seeded_database.session_factory() as session:
        with pytest.raises(InvalidControllerCredentialError):
            ControllerAuthenticationService().authenticate(
                session,
                **SCOPE,
                token=credential.token,
            )


def test_unknown_and_cross_scope_revocation_change_nothing(
    seeded_database: DatabaseFixture,
) -> None:
    credential = issue(seeded_database, "scope-bound")
    service = ControllerCredentialLifecycleService(
        seeded_database.session_factory
    )

    with pytest.raises(ControllerCredentialNotFoundError):
        service.revoke(**SCOPE, credential_id="unknown-credential")
    with pytest.raises(ControllerCredentialNotFoundError):
        service.revoke(
            organization_id="demo-organization",
            location_id="demo-secondary-dining",
            controller_id="demo-secondary-controller-01",
            credential_id="scope-bound",
        )

    with seeded_database.session_factory() as session:
        identity = ControllerAuthenticationService().authenticate(
            session,
            **SCOPE,
            token=credential.token,
        )
    assert identity.credential_id == "scope-bound"


def test_lifecycle_listing_is_scoped_and_exposes_only_safe_metadata(
    seeded_database: DatabaseFixture,
) -> None:
    active = issue(seeded_database, "list-active")
    revoked = issue(seeded_database, "list-revoked")
    service = ControllerCredentialLifecycleService(
        seeded_database.session_factory
    )
    service.revoke(**SCOPE, credential_id="list-revoked")

    result = service.list_credentials(**SCOPE)

    assert (result.total_count, result.active_count, result.revoked_count) == (
        2,
        1,
        1,
    )
    assert [item.credential_id for item in result.credentials] == [
        "list-active",
        "list-revoked",
    ]
    assert {item.status for item in result.credentials} == {
        "active",
        "revoked",
    }
    assert {field.name for field in fields(ControllerCredentialMetadata)} == {
        "credential_id",
        "created_at",
        "status",
        "revoked_at",
    }
    serialized = repr(result)
    for secret in (
        active.token,
        revoked.token,
        digest_controller_token(active.token),
        digest_controller_token(revoked.token),
    ):
        assert secret not in serialized


def test_list_cli_outputs_safe_counts_and_no_secrets(
    seeded_database: DatabaseFixture,
    capsys,
) -> None:
    credential = issue(seeded_database, "cli-list-safe")

    result = list_dev_controller_credentials.main(
        SCOPE_ARGUMENTS,
        seeded_database.session_factory,
    )

    output = capsys.readouterr()
    assert result == 0
    assert "credentialId=cli-list-safe" in output.out
    assert "status=active" in output.out
    assert "revokedAt=none" in output.out
    assert "total=1\nactive=1\nrevoked=0" in output.out
    assert credential.token not in output.out
    assert digest_controller_token(credential.token) not in output.out
    assert output.err == ""


def test_list_unknown_controller_and_revoke_unknown_credential_fail_safely(
    seeded_database: DatabaseFixture,
    capsys,
) -> None:
    list_result = list_dev_controller_credentials.main(
        [
            "--organization-id",
            "demo-organization",
            "--location-id",
            "demo-main-dining",
            "--controller-id",
            "unknown-controller",
        ],
        seeded_database.session_factory,
    )
    listed = capsys.readouterr()
    assert list_result == 1
    assert listed.out == ""
    assert "not found" in listed.err

    revoke_result = revoke_dev_controller_credential.main(
        [*SCOPE_ARGUMENTS, "--credential-id", "unknown-credential"],
        seeded_database.session_factory,
    )
    revoked = capsys.readouterr()
    assert revoke_result == 1
    assert revoked.out == ""
    assert "not found" in revoked.err


def test_revocation_survives_database_engine_recreation(
    seeded_database: DatabaseFixture,
) -> None:
    revoked = issue(seeded_database, "restart-revoked")
    active = issue(seeded_database, "restart-active")
    ControllerCredentialLifecycleService(
        seeded_database.session_factory
    ).revoke(**SCOPE, credential_id="restart-revoked")
    seeded_database.engine.dispose()

    recreated_engine = create_database_engine(seeded_database.url)
    session_factory = create_session_factory(recreated_engine)
    with session_factory() as session:
        authentication = ControllerAuthenticationService()
        with pytest.raises(InvalidControllerCredentialError):
            authentication.authenticate(
                session,
                **SCOPE,
                token=revoked.token,
            )
        assert authentication.authenticate(
            session,
            **SCOPE,
            token=active.token,
        ).credential_id == "restart-active"
    recreated_engine.dispose()


def test_listing_unknown_controller_scope_raises_without_credentials(
    seeded_database: DatabaseFixture,
) -> None:
    service = ControllerCredentialLifecycleService(
        seeded_database.session_factory
    )

    with pytest.raises(ControllerCredentialScopeNotFoundError):
        service.list_credentials(
            organization_id="demo-organization",
            location_id="demo-main-dining",
            controller_id="unknown-controller",
        )

    with seeded_database.session_factory() as session:
        assert session.scalars(select(ControllerCredentialRecord)).all() == []
