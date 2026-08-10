from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


RequestedRole = Literal[
    "utility-worker",
    "supervisor-manager",
    "technician",
]
AccessRequestStatus = Literal["pending", "approved", "rejected"]


class SignupOrganizationResponse(BaseModel):
    id: str
    name: str


class SignupLocationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    organization_id: str = Field(alias="organizationId")
    name: str


class SignupOptionsResponse(BaseModel):
    organizations: tuple[SignupOrganizationResponse, ...]
    locations: tuple[SignupLocationResponse, ...]


class AccessRequestCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    full_name: str = Field(alias="fullName", min_length=2, max_length=255)
    organization_id: str = Field(alias="organizationId", min_length=1, max_length=255)
    location_id: str = Field(alias="locationId", min_length=1, max_length=255)
    requested_role: RequestedRole = Field(alias="requestedRole")

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Full name is required.")
        return normalized


class AccessRequestResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    verified_email: str = Field(alias="verifiedEmail")
    full_name: str = Field(alias="fullName")
    requested_organization_id: str = Field(alias="requestedOrganizationId")
    requested_organization_name: str = Field(alias="requestedOrganizationName")
    requested_location_id: str = Field(alias="requestedLocationId")
    requested_location_name: str = Field(alias="requestedLocationName")
    requested_role: RequestedRole = Field(alias="requestedRole")
    status: AccessRequestStatus
    approved_role: RequestedRole | None = Field(alias="approvedRole")
    approved_location_id: str | None = Field(alias="approvedLocationId")
    approved_location_name: str | None = Field(alias="approvedLocationName")
    review_note: str | None = Field(alias="reviewNote")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class AccessStatusResponse(BaseModel):
    status: Literal["active", "pending", "rejected", "no-request"]
    request: AccessRequestResponse | None


class AccessRequestListResponse(BaseModel):
    requests: tuple[AccessRequestResponse, ...]
    locations: tuple[SignupLocationResponse, ...]


class AccessRequestApproval(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    approved_role: RequestedRole = Field(alias="approvedRole")
    approved_location_id: str | None = Field(
        default=None,
        alias="approvedLocationId",
        max_length=255,
    )


class AccessRequestRejection(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    review_note: str | None = Field(default=None, alias="reviewNote", max_length=1000)
