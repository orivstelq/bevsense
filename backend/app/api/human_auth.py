from typing import Annotated

from fastapi import Depends, HTTPException, Path, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.dependencies import (
    get_human_auth_enabled,
    get_human_authorization_service,
)
from app.security.human_tokens import (
    HumanAuthenticationUnavailableError,
    InvalidHumanTokenError,
)
from app.services.human_authorization_service import (
    AuthorizedHumanAccount,
    AuthorizedHumanAccess,
    HumanAccessForbiddenError,
    HumanAuthorizationService,
)


human_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="HumanBearer",
    description="Supabase human access token for protected portal reads.",
)


def authorize_snapshot_read(
    organization_id: Annotated[str, Path(min_length=1)],
    location_id: Annotated[str, Path(min_length=1)],
    enabled: Annotated[bool, Depends(get_human_auth_enabled)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Security(human_bearer),
    ],
    service: Annotated[
        HumanAuthorizationService | None,
        Depends(get_human_authorization_service),
    ],
) -> AuthorizedHumanAccess | None:
    if not enabled:
        return None
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if service is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Authentication is temporarily unavailable.",
        )

    try:
        return service.authorize_snapshot(
            credentials.credentials,
            organization_id,
            location_id,
        )
    except InvalidHumanTokenError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except HumanAccessForbiddenError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Access is not permitted.",
        ) from None
    except HumanAuthenticationUnavailableError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Authentication is temporarily unavailable.",
        ) from None


def authenticate_human_account(
    enabled: Annotated[bool, Depends(get_human_auth_enabled)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Security(human_bearer),
    ],
    service: Annotated[
        HumanAuthorizationService | None,
        Depends(get_human_authorization_service),
    ],
) -> AuthorizedHumanAccount:
    if not enabled or service is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Human authentication is not available.",
        )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return service.resolve_account(credentials.credentials)
    except InvalidHumanTokenError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except HumanAccessForbiddenError:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Access is not permitted.",
        ) from None
    except HumanAuthenticationUnavailableError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Authentication is temporarily unavailable.",
        ) from None
