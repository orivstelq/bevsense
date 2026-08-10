from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.human_auth import (
    authenticate_human_account,
    authenticate_human_identity,
)
from app.dependencies import (
    get_access_request_service,
    get_self_signup_enabled,
)
from app.models.access_requests import (
    AccessRequestApproval,
    AccessRequestCreate,
    AccessRequestListResponse,
    AccessRequestRejection,
    AccessRequestResponse,
    AccessStatusResponse,
    SignupLocationResponse,
    SignupOptionsResponse,
    SignupOrganizationResponse,
)
from app.security.human_tokens import AuthenticatedHuman
from app.services.access_request_service import (
    AccessRequestConflictError,
    AccessRequestForbiddenError,
    AccessRequestNotFoundError,
    AccessRequestService,
    AccessRequestValidationError,
    AccessRequestView,
)
from app.services.human_authorization_service import AuthorizedHumanAccount


router = APIRouter()


def _response(view: AccessRequestView) -> AccessRequestResponse:
    return AccessRequestResponse(
        id=view.id,
        verified_email=view.verified_email,
        full_name=view.full_name,
        requested_organization_id=view.requested_organization_id,
        requested_organization_name=view.requested_organization_name,
        requested_location_id=view.requested_location_id,
        requested_location_name=view.requested_location_name,
        requested_role=view.requested_role,
        status=view.status,
        approved_role=view.approved_role,
        approved_location_id=view.approved_location_id,
        approved_location_name=view.approved_location_name,
        review_note=view.review_note,
        created_at=view.created_at,
        updated_at=view.updated_at,
    )


def _raise_service_error(error: Exception) -> None:
    if isinstance(error, AccessRequestValidationError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error))
    if isinstance(error, AccessRequestForbiddenError):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access is not permitted.")
    if isinstance(error, AccessRequestNotFoundError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Access request was not found.")
    if isinstance(error, AccessRequestConflictError):
        raise HTTPException(status.HTTP_409_CONFLICT, str(error))
    raise error


@router.get(
    "/public/signup-options",
    response_model=SignupOptionsResponse,
    summary="List safe public signup choices",
    tags=["Public onboarding"],
)
def get_signup_options(
    enabled: Annotated[bool, Depends(get_self_signup_enabled)],
    service: Annotated[AccessRequestService, Depends(get_access_request_service)],
) -> SignupOptionsResponse:
    if not enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Self-signup is not enabled.")
    organizations, locations = service.get_signup_options()
    return SignupOptionsResponse(
        organizations=tuple(
            SignupOrganizationResponse(id=item.id, name=item.name)
            for item in organizations
        ),
        locations=tuple(
            SignupLocationResponse(
                id=item.id,
                organization_id=item.organization_id,
                name=item.name,
            )
            for item in locations
        ),
    )


@router.get(
    "/account/access-status",
    response_model=AccessStatusResponse,
    summary="Get the authenticated user's onboarding status",
    tags=["Human account"],
)
def get_access_status(
    identity: Annotated[AuthenticatedHuman, Depends(authenticate_human_identity)],
    service: Annotated[AccessRequestService, Depends(get_access_request_service)],
) -> AccessStatusResponse:
    result = service.get_access_status(identity)
    return AccessStatusResponse(
        status=result.status,
        request=_response(result.request) if result.request else None,
    )


@router.post(
    "/account/access-request",
    response_model=AccessRequestResponse,
    summary="Create or resubmit the authenticated user's access request",
    tags=["Human account"],
)
def submit_access_request(
    body: AccessRequestCreate,
    enabled: Annotated[bool, Depends(get_self_signup_enabled)],
    identity: Annotated[AuthenticatedHuman, Depends(authenticate_human_identity)],
    service: Annotated[AccessRequestService, Depends(get_access_request_service)],
) -> AccessRequestResponse:
    if not enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Self-signup is not enabled.")
    try:
        return _response(
            service.submit_request(
                identity,
                full_name=body.full_name,
                organization_id=body.organization_id,
                location_id=body.location_id,
                requested_role=body.requested_role,
            )
        )
    except (
        AccessRequestConflictError,
        AccessRequestValidationError,
    ) as error:
        _raise_service_error(error)
        raise AssertionError("unreachable")


@router.get(
    "/access-requests",
    response_model=AccessRequestListResponse,
    summary="List access requests in the reviewer's organizations",
    tags=["Access review"],
)
def list_access_requests(
    reviewer: Annotated[AuthorizedHumanAccount, Depends(authenticate_human_account)],
    service: Annotated[AccessRequestService, Depends(get_access_request_service)],
    request_status: Annotated[
        Literal["pending", "approved", "rejected"],
        Query(alias="status"),
    ] = "pending",
) -> AccessRequestListResponse:
    try:
        requests = service.list_requests(reviewer, request_status)
    except AccessRequestForbiddenError as error:
        _raise_service_error(error)
        raise AssertionError("unreachable")
    organization_ids = {
        membership.organization_id
        for membership in reviewer.memberships
        if membership.role in {"supervisor-manager", "organization-admin"}
    }
    _, locations = service.get_signup_options()
    return AccessRequestListResponse(
        requests=tuple(_response(item) for item in requests),
        locations=tuple(
            SignupLocationResponse(
                id=item.id,
                organization_id=item.organization_id,
                name=item.name,
            )
            for item in locations
            if item.organization_id in organization_ids
        ),
    )


@router.post(
    "/access-requests/{request_id}/approve",
    response_model=AccessRequestResponse,
    summary="Approve an access request",
    tags=["Access review"],
)
def approve_access_request(
    request_id: UUID,
    body: AccessRequestApproval,
    reviewer: Annotated[AuthorizedHumanAccount, Depends(authenticate_human_account)],
    service: Annotated[AccessRequestService, Depends(get_access_request_service)],
) -> AccessRequestResponse:
    try:
        return _response(
            service.approve_request(
                reviewer,
                request_id,
                approved_role=body.approved_role,
                approved_location_id=body.approved_location_id,
            )
        )
    except (
        AccessRequestConflictError,
        AccessRequestForbiddenError,
        AccessRequestNotFoundError,
        AccessRequestValidationError,
    ) as error:
        _raise_service_error(error)
        raise AssertionError("unreachable")


@router.post(
    "/access-requests/{request_id}/reject",
    response_model=AccessRequestResponse,
    summary="Reject an access request",
    tags=["Access review"],
)
def reject_access_request(
    request_id: UUID,
    body: AccessRequestRejection,
    reviewer: Annotated[AuthorizedHumanAccount, Depends(authenticate_human_account)],
    service: Annotated[AccessRequestService, Depends(get_access_request_service)],
) -> AccessRequestResponse:
    try:
        return _response(
            service.reject_request(reviewer, request_id, body.review_note)
        )
    except (
        AccessRequestConflictError,
        AccessRequestForbiddenError,
        AccessRequestNotFoundError,
    ) as error:
        _raise_service_error(error)
        raise AssertionError("unreachable")
