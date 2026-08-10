import argparse
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select

from app.db.engine import SessionFactory, get_session_factory
from app.db.models import (
    LocationAssignmentRecord,
    LocationRecord,
    OrganizationMembershipRecord,
    OrganizationRecord,
    UserProfileRecord,
)


ROLES = (
    "utility-worker",
    "supervisor-manager",
    "organization-admin",
    "technician",
)


def provision(
    session_factory: SessionFactory,
    *,
    auth_user_id: UUID,
    display_name: str,
    organization_id: str,
    role: str,
    location_ids: tuple[str, ...],
    preferred_language: str = "en",
) -> None:
    if role not in ROLES:
        raise ValueError("Unsupported BevSense role.")
    if preferred_language not in {"en", "es"}:
        raise ValueError("Preferred language must be en or es.")
    if role == "utility-worker" and len(location_ids) != 1:
        raise ValueError("Utility workers require exactly one location assignment.")
    if role == "technician" and not location_ids:
        raise ValueError("Technicians require at least one location assignment.")

    now = datetime.now(UTC)
    with session_factory() as session:
        if session.get(OrganizationRecord, organization_id) is None:
            raise ValueError("Organization does not exist.")
        locations = tuple(
            session.scalars(
                select(LocationRecord).where(
                    LocationRecord.organization_id == organization_id,
                    LocationRecord.id.in_(location_ids),
                )
            )
        )
        if {location.id for location in locations} != set(location_ids):
            raise ValueError("Every assigned location must belong to the organization.")

        profile = session.get(UserProfileRecord, auth_user_id)
        if profile is None:
            session.add(
                UserProfileRecord(
                    auth_user_id=auth_user_id,
                    display_name=display_name,
                    preferred_language=preferred_language,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
            )
        else:
            profile.display_name = display_name
            profile.preferred_language = preferred_language
            profile.updated_at = now

        session.flush()
        membership = session.get(
            OrganizationMembershipRecord,
            (auth_user_id, organization_id),
        )
        if membership is None:
            session.add(
                OrganizationMembershipRecord(
                    auth_user_id=auth_user_id,
                    organization_id=organization_id,
                    role=role,
                    is_active=True,
                    created_at=now,
                )
            )
        else:
            membership.role = role
            membership.is_active = True

        session.flush()
        session.execute(
            delete(LocationAssignmentRecord).where(
                LocationAssignmentRecord.auth_user_id == auth_user_id,
                LocationAssignmentRecord.organization_id == organization_id,
            )
        )
        session.add_all(
            LocationAssignmentRecord(
                auth_user_id=auth_user_id,
                organization_id=organization_id,
                location_id=location_id,
                created_at=now,
            )
            for location_id in location_ids
        )
        session.commit()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Associate an existing Supabase Auth user with BevSense."
    )
    parser.add_argument("--auth-user-id", type=UUID, required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--organization-id", required=True)
    parser.add_argument("--role", choices=ROLES, required=True)
    parser.add_argument("--location-id", action="append", default=[])
    parser.add_argument("--preferred-language", choices=("en", "es"), default="en")
    args = parser.parse_args(argv)
    provision(
        get_session_factory(),
        auth_user_id=args.auth_user_id,
        display_name=args.display_name,
        organization_id=args.organization_id,
        role=args.role,
        location_ids=tuple(dict.fromkeys(args.location_id)),
        preferred_language=args.preferred_language,
    )
    print("BevSense membership provisioned.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
