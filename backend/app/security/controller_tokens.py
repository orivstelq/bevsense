from hashlib import sha256
from secrets import token_urlsafe


CONTROLLER_TOKEN_PREFIX = "bvs_ctrl_"
CONTROLLER_TOKEN_ENTROPY_BYTES = 32


def generate_controller_token() -> str:
    return CONTROLLER_TOKEN_PREFIX + token_urlsafe(CONTROLLER_TOKEN_ENTROPY_BYTES)


def digest_controller_token(token: str) -> str:
    return sha256(token.encode()).hexdigest()
