from jose import JWTError, jwt

from app.config import get_settings
from app.utils.exceptions import AppException

settings = get_settings()

MICROSOFT_JWKS_URL = (
    f"https://login.microsoftonline.com/{settings.microsoft_tenant_id}/discovery/v2.0/keys"
)


def _find_rsa_key(jwks: dict, kid: str) -> dict | None:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"],
            }
    return None


def _extract_email(payload: dict) -> str | None:
    for claim in ("email", "preferred_username", "upn"):
        value = payload.get(claim)
        if isinstance(value, str) and "@" in value:
            return value.strip().lower()
    return None


async def verify_microsoft_id_token(id_token: str) -> dict:
    if not settings.microsoft_client_id:
        raise AppException(
            status_code=503,
            message="Microsoft login is not configured on the server",
        )

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise AppException(status_code=401, message="Invalid Microsoft token") from exc

    kid = header.get("kid")
    if not kid:
        raise AppException(status_code=401, message="Invalid Microsoft token")

    import httpx

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(MICROSOFT_JWKS_URL)
        response.raise_for_status()
        jwks = response.json()

    rsa_key = _find_rsa_key(jwks, kid)
    if not rsa_key:
        raise AppException(status_code=401, message="Invalid Microsoft token")

    try:
        payload = jwt.decode(
            id_token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.microsoft_client_id,
            options={"verify_iss": False},
        )
    except JWTError as exc:
        raise AppException(status_code=401, message="Invalid Microsoft token") from exc

    issuer = payload.get("iss", "")
    if not issuer.startswith("https://login.microsoftonline.com/") or not issuer.endswith("/v2.0"):
        raise AppException(status_code=401, message="Invalid Microsoft token issuer")

    email = _extract_email(payload)
    if not email:
        raise AppException(status_code=401, message="Microsoft account email not found in token")

    allowed_suffix = f"@{settings.allowed_email_domain.lower()}"
    if not email.endswith(allowed_suffix):
        raise AppException(
            status_code=403,
            message=f"Only @{settings.allowed_email_domain} accounts can sign in",
        )

    return payload
