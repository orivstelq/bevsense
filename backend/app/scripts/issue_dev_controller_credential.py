import argparse
import sys

from sqlalchemy.exc import IntegrityError

from app.db.engine import SessionFactory, get_session_factory
from app.services.controller_authentication_service import (
    ControllerCredentialIssuanceService,
    ControllerCredentialScopeNotFoundError,
    IssuedControllerCredential,
)


def _arguments(arguments: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Issue a development credential for one controller."
    )
    parser.add_argument("--organization-id", required=True)
    parser.add_argument("--location-id", required=True)
    parser.add_argument("--controller-id", required=True)
    parser.add_argument("--credential-id")
    parser.add_argument("--print-token-only", action="store_true")
    return parser.parse_args(arguments)


def _print_credential(
    credential: IssuedControllerCredential,
    *,
    token_only: bool,
) -> None:
    if token_only:
        print(credential.token)
        return

    print(f"credentialId={credential.identity.credential_id}")
    print(f"controllerId={credential.identity.controller_id}")
    print(f"token={credential.token}")
    print("Token shown once; the database stores only its SHA-256 digest.")


def main(
    arguments: list[str] | None = None,
    session_factory: SessionFactory | None = None,
) -> int:
    parsed = _arguments(arguments)
    service = ControllerCredentialIssuanceService(
        session_factory or get_session_factory()
    )
    try:
        credential = service.issue(
            organization_id=parsed.organization_id,
            location_id=parsed.location_id,
            controller_id=parsed.controller_id,
            credential_id=parsed.credential_id,
        )
    except ControllerCredentialScopeNotFoundError as error:
        print(f"Credential not issued: {error}", file=sys.stderr)
        return 1
    except IntegrityError:
        print(
            "Credential not issued: credential ID or token digest already exists.",
            file=sys.stderr,
        )
        return 1

    _print_credential(credential, token_only=parsed.print_token_only)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
