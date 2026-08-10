from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.human_auth import authenticate_human_account
from app.models.human_auth import HumanAccountResponse, HumanMembershipResponse
from app.services.human_authorization_service import AuthorizedHumanAccount


router = APIRouter(tags=["Human account"])


@router.get(
    "/me",
    response_model=HumanAccountResponse,
    summary="Resolve the authenticated BevSense account",
)
def get_human_account(
    account: Annotated[
        AuthorizedHumanAccount,
        Depends(authenticate_human_account),
    ],
) -> HumanAccountResponse:
    return HumanAccountResponse(
        display_name=account.display_name,
        preferred_language=account.preferred_language,
        memberships=tuple(
            HumanMembershipResponse(
                organization_id=membership.organization_id,
                role=membership.role,
                location_ids=membership.location_ids,
            )
            for membership in account.memberships
        ),
    )
