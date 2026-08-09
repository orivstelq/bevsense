import argparse
import sys

from app.db.engine import SessionFactory, get_session_factory
from app.services.controller_credential_lifecycle_service import (
    ControllerCredentialLifecycleService,
    ControllerCredentialNotFoundError,
)


def _arguments(arguments: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Permanently revoke one development controller credential."
    )
    parser.add_argument("--organization-id", required=True)
    parser.add_argument("--location-id", required=True)
    parser.add_argument("--controller-id", required=True)
    parser.add_argument("--credential-id", required=True)
    return parser.parse_args(arguments)


def main(
    arguments: list[str] | None = None,
    session_factory: SessionFactory | None = None,
) -> int:
    parsed = _arguments(arguments)
    service = ControllerCredentialLifecycleService(
        session_factory or get_session_factory()
    )
    try:
        result = service.revoke(
            organization_id=parsed.organization_id,
            location_id=parsed.location_id,
            controller_id=parsed.controller_id,
            credential_id=parsed.credential_id,
        )
    except ControllerCredentialNotFoundError as error:
        print(f"Credential not revoked: {error}", file=sys.stderr)
        return 1

    revoked_at = result.credential.revoked_at
    print(f"credentialId={result.credential.credential_id}")
    print(f"result={result.result}")
    print(f"status={result.credential.status}")
    revoked_at_text = (
        revoked_at.isoformat().replace("+00:00", "Z")
        if revoked_at
        else "none"
    )
    print(f"revokedAt={revoked_at_text}")
    print(f"activeCredentialsRemaining={result.active_credentials_remaining}")
    if result.active_credentials_remaining == 0:
        print(
            "warning=No active credentials remain for this controller.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
