import pytest

from app.services.oidc_discovery import OIDCDiscoveryError, _validate_endpoint_url


@pytest.mark.parametrize(
    "url",
    [
        "http://identity.example.com/.well-known/openid-configuration",
        "https://user:password@identity.example.com/.well-known/openid-configuration",
        "https://127.0.0.1/.well-known/openid-configuration",
        "https://192.168.1.10/.well-known/openid-configuration",
        "https://identity.example.com/path#fragment",
    ],
)
def test_discovery_rejects_unsafe_urls(url: str) -> None:
    with pytest.raises(OIDCDiscoveryError):
        _validate_endpoint_url(url, "discovery_url")


def test_discovery_accepts_https_public_hostname() -> None:
    assert (
        _validate_endpoint_url("https://identity.example.com/oidc", "issuer")
        == "https://identity.example.com/oidc"
    )
