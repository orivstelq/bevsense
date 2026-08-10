from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    LocationAssignmentRecord,
    OrganizationMembershipRecord,
    UserProfileRecord,
)


@dataclass(frozen=True, slots=True)
class HumanAccessRecords:
    profile: UserProfileRecord | None
    membership: OrganizationMembershipRecord | None
    assigned_to_location: bool


@dataclass(frozen=True, slots=True)
class HumanAccountRecords:
    profile: UserProfileRecord | None
    memberships: tuple[OrganizationMembershipRecord, ...]
    assignments: tuple[LocationAssignmentRecord, ...]


class HumanAccessRepository:
    def get_account_records(
        self,
        session: Session,
        auth_user_id: UUID,
    ) -> HumanAccountRecords:
        return HumanAccountRecords(
            profile=session.get(UserProfileRecord, auth_user_id),
            memberships=tuple(
                session.scalars(
                    select(OrganizationMembershipRecord)
                    .where(
                        OrganizationMembershipRecord.auth_user_id
                        == auth_user_id
                    )
                    .order_by(OrganizationMembershipRecord.organization_id)
                )
            ),
            assignments=tuple(
                session.scalars(
                    select(LocationAssignmentRecord)
                    .where(
                        LocationAssignmentRecord.auth_user_id == auth_user_id
                    )
                    .order_by(
                        LocationAssignmentRecord.organization_id,
                        LocationAssignmentRecord.location_id,
                    )
                )
            ),
        )

    def get_access_records(
        self,
        session: Session,
        auth_user_id: UUID,
        organization_id: str,
        location_id: str,
    ) -> HumanAccessRecords:
        return HumanAccessRecords(
            profile=session.get(UserProfileRecord, auth_user_id),
            membership=session.get(
                OrganizationMembershipRecord,
                (auth_user_id, organization_id),
            ),
            assigned_to_location=session.scalar(
                select(LocationAssignmentRecord.auth_user_id).where(
                    LocationAssignmentRecord.auth_user_id == auth_user_id,
                    LocationAssignmentRecord.organization_id == organization_id,
                    LocationAssignmentRecord.location_id == location_id,
                )
            )
            is not None,
        )
