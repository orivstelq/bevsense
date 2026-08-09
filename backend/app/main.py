from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router as api_router
from app.core.config import settings


app = FastAPI(
    title="BiB Platform API",
    summary="Versioned telemetry API for the BiB monitoring platform.",
    version=settings.api_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/", summary="Identify the API service", tags=["Service"])
def get_service() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "docs": "/docs",
    }


app.include_router(api_router, prefix="/api")
