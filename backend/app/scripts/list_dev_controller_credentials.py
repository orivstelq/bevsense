import argparse
import sys
from datetime import datetime

from app.db.engine import SessionFactory, get_session_factory
from app.services.controller_authentication_service import (
    ControllerCredentialScopeNotFoundError,
)
from app.services.controller_credential_lifecycle_service import (
    ControllerCredentialLifecycleService,
    ControllerCredentialMetadata,
)


def _arguments(arguments: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="List safe metadata for one controller's credentials."
    )
    parser.add_argument("--organization-id", required=True)
    parser.add_argument("--location-id", required=True)
    parser.add_argument("--controller-id", required=True)
    return parser.parse_args(arguments)


def _timestamp(value: datetime | None) -> str:
    return value.isoformat().replace("+00:00", "Z") if value else "none"


def _print_credential(credential: ControllerCredentialMetadata) -> None:
    print(f"credentialId={credential.credential_id}")
    print(f"createdAt={_timestamp(credential.created_at)}")
    print(f"status={credential.status}")
    print(f"revokedAt={_timestamp(credential.revoked_at)}")


def main(
    arguments: list[str] | None = None,
    session_factory: SessionFactory | None = None,
) -> int:
    parsed = _arguments(arguments)
    service = ControllerCredentialLifecycleService(
        session_factory or get_session_factory()
    )
    try:
        result = service.list_credentials(
            organization_id=parsed.organization_id,
            location_id=parsed.location_id,
            controller_id=parsed.controller_id,
        )
    except ControllerCredentialScopeNotFoundError as error:
        print(f"Credentials not listed: {error}", file=sys.stderr)
        return 1

    for credential in result.credentials:
        _print_credential(credential)
    print(f"total={result.total_count}")
    print(f"active={result.active_count}")
    print(f"revoked={result.revoked_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
