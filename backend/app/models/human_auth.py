from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HumanMembershipResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    organization_id: str = Field(alias="organizationId")
    role: Literal[
        "utility-worker",
        "supervisor-manager",
        "organization-admin",
        "technician",
    ]
    location_ids: tuple[str, ...] = Field(alias="locationIds")


class HumanAccountResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    display_name: str = Field(alias="displayName")
    preferred_language: Literal["en", "es"] = Field(alias="preferredLanguage")
    memberships: tuple[HumanMembershipResponse, ...]
