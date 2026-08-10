from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

import httpx


class InvalidHumanTokenError(Exception):
    pass


class HumanAuthenticationUnavailableError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AuthenticatedHuman:
    auth_user_id: UUID


class HumanTokenVerifier(Protocol):
    def verify(self, token: str) -> AuthenticatedHuman: ...


class SupabaseHumanTokenVerifier:
    def __init__(
        self,
        supabase_url: str,
        publishable_key: str,
        timeout_seconds: float = 5,
    ) -> None:
        self._user_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
        self._publishable_key = publishable_key
        self._timeout_seconds = timeout_seconds

    def verify(self, token: str) -> AuthenticatedHuman:
        try:
            response = httpx.get(
                self._user_url,
                headers={
                    "apikey": self._publishable_key,
                    "Authorization": f"Bearer {token}",
                },
                timeout=self._timeout_seconds,
            )
        except httpx.HTTPError as error:
            raise HumanAuthenticationUnavailableError(
                "Human authentication is temporarily unavailable."
            ) from error

        if response.status_code in {401, 403}:
            raise InvalidHumanTokenError("Invalid human access token.")
        if not response.is_success:
            raise HumanAuthenticationUnavailableError(
                "Human authentication is temporarily unavailable."
            )

        try:
            auth_user_id = UUID(response.json()["id"])
        except (KeyError, TypeError, ValueError) as error:
            raise InvalidHumanTokenError("Invalid human access token.") from error

        return AuthenticatedHuman(auth_user_id=auth_user_id)
