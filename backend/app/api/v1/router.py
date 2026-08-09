from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.api.v1.telemetry import router as telemetry_router
from app.core.config import settings


class HealthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Literal["ok"] = "ok"
    service: str
    api_version: Literal["v1"] = Field(default="v1", alias="apiVersion")


router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Check API process readiness",
    tags=["Health"],
)
def get_health() -> HealthResponse:
    return HealthResponse(service=settings.service_name)


router.include_router(telemetry_router)
