from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ControllerCredentialRecord, ControllerRecord


class ControllerCredentialRepository:
    def controller_exists(
        self,
        session: Session,
        organization_id: str,
        location_id: str,
        controller_id: str,
    ) -> bool:
        return (
            session.scalar(
                select(ControllerRecord.id).where(
                    ControllerRecord.id == controller_id,
                    ControllerRecord.organization_id == organization_id,
                    ControllerRecord.location_id == location_id,
                )
            )
            is not None
        )

    def get_active_controller_credentials(
        self,
        session: Session,
        organization_id: str,
        location_id: str,
        controller_id: str,
    ) -> tuple[ControllerCredentialRecord, ...]:
        records = session.scalars(
            select(ControllerCredentialRecord)
            .where(
                ControllerCredentialRecord.organization_id == organization_id,
                ControllerCredentialRecord.location_id == location_id,
                ControllerCredentialRecord.controller_id == controller_id,
                ControllerCredentialRecord.revoked_at.is_(None),
            )
            .order_by(ControllerCredentialRecord.id)
        ).all()
        return tuple(records)

    def list_controller_credentials(
        self,
        session: Session,
        organization_id: str,
        location_id: str,
        controller_id: str,
    ) -> tuple[ControllerCredentialRecord, ...]:
        records = session.scalars(
            select(ControllerCredentialRecord)
            .where(
                ControllerCredentialRecord.organization_id == organization_id,
                ControllerCredentialRecord.location_id == location_id,
                ControllerCredentialRecord.controller_id == controller_id,
            )
            .order_by(
                ControllerCredentialRecord.created_at,
                ControllerCredentialRecord.id,
            )
        ).all()
        return tuple(records)

    def get_controller_credential(
        self,
        session: Session,
        organization_id: str,
        location_id: str,
        controller_id: str,
        credential_id: str,
    ) -> ControllerCredentialRecord | None:
        return session.scalar(
            select(ControllerCredentialRecord).where(
                ControllerCredentialRecord.id == credential_id,
                ControllerCredentialRecord.organization_id == organization_id,
                ControllerCredentialRecord.location_id == location_id,
                ControllerCredentialRecord.controller_id == controller_id,
            )
        )

    def add_credential(
        self,
        session: Session,
        credential: ControllerCredentialRecord,
    ) -> None:
        session.add(credential)

    def revoke_credential(
        self,
        credential: ControllerCredentialRecord,
        revoked_at: datetime,
    ) -> None:
        credential.revoked_at = revoked_at
