"""OIDC discovery and metadata validation.

Provider metadata is untrusted input. This module rejects non-HTTPS endpoints,
credentials embedded in URLs, and literal non-public IP addresses. Requests do
not follow redirects, preventing a metadata endpoint from redirecting the
backend to an unrelated URL.
"""

import ipaddress
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException, status

from app.db.models.oidc_provider import OIDCProviderModel


class OIDCDiscoveryError(ValueError):
    """Raised when a provider's discovery document is unsafe or inconsistent."""


def _validate_endpoint_url(value: str, field: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        raise OIDCDiscoveryError(f"{field} must be an HTTPS URL without credentials or fragments")
    try:
        address = ipaddress.ip_address(parsed.hostname)
    except ValueError:
        pass
    else:
        if not address.is_global:
            raise OIDCDiscoveryError(f"{field} must not use a private or reserved IP address")
    return value


def discovery_url_for(provider: OIDCProviderModel) -> str:
    """Return the configured discovery URL or the OIDC well-known default."""
    if provider.discovery_url:
        return _validate_endpoint_url(provider.discovery_url, "discovery_url")
    issuer = _validate_endpoint_url(provider.issuer, "issuer").rstrip("/")
    return f"{issuer}/.well-known/openid-configuration"


async def load_provider_metadata(provider: OIDCProviderModel) -> dict:
    """Fetch and validate OIDC metadata for a configured provider."""
    discovery_url = discovery_url_for(provider)
    timeout = httpx.Timeout(8.0, connect=4.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            response = await client.get(
                discovery_url,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            metadata = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve a valid OIDC discovery document",
        ) from exc

    if not isinstance(metadata, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OIDC discovery document must be a JSON object",
        )
    if metadata.get("issuer", "").rstrip("/") != provider.issuer.rstrip("/"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OIDC discovery issuer does not match the configured issuer",
        )

    required = ("authorization_endpoint", "token_endpoint", "jwks_uri")
    for field in required:
        endpoint = metadata.get(field)
        if not isinstance(endpoint, str):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OIDC discovery document is missing {field}",
            )
        try:
            _validate_endpoint_url(endpoint, field)
        except OIDCDiscoveryError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OIDC discovery document contains an unsafe {field}",
            ) from exc

    userinfo_endpoint = metadata.get("userinfo_endpoint")
    if userinfo_endpoint is not None:
        try:
            _validate_endpoint_url(userinfo_endpoint, "userinfo_endpoint")
        except OIDCDiscoveryError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OIDC discovery document contains an unsafe userinfo_endpoint",
            ) from exc

    if "code" not in metadata.get("response_types_supported", ["code"]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="OIDC provider does not advertise authorization-code response support",
        )
    return metadata
