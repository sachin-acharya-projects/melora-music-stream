from cryptography.fernet import Fernet

from app.core.config import settings


def test_oidc_provider_admin_endpoints_require_admin(client) -> None:
    response = client.get("/api/v1/admin/oidc-providers")

    assert response.status_code == 401


def test_admin_can_create_provider_without_exposing_secret(
    client, admin_headers, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", Fernet.generate_key().decode())

    response = client.post(
        "/api/v1/admin/oidc-providers",
        headers=admin_headers,
        json={
            "name": "test-idp",
            "issuer": "https://identity.example.com",
            "client_id": "melora-client",
            "client_secret": "provider-secret",
            "display_name": "Example Identity",
            "enabled": True,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "test-idp"
    assert data["has_client_secret"] is True
    assert data["redirect_uri"].endswith(
        f"/api/v1/auth/providers/{data['id']}/callback"
    )
    assert "client_secret" not in data
    assert "provider-secret" not in response.text


def test_public_login_provider_list_only_returns_enabled_providers(
    client, admin_headers, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "OIDC_SECRET_ENCRYPTION_KEY", Fernet.generate_key().decode())
    for name, enabled in [("enabled-idp", True), ("disabled-idp", False)]:
        response = client.post(
            "/api/v1/admin/oidc-providers",
            headers=admin_headers,
            json={
                "name": name,
                "issuer": f"https://{name}.example.com",
                "client_id": "client",
                "client_secret": "secret",
                "display_name": name,
                "enabled": enabled,
            },
        )
        assert response.status_code == 201

    response = client.get("/api/v1/auth/providers")

    assert response.status_code == 200
    assert [provider["name"] for provider in response.json()] == ["enabled-idp"]
    assert "client_id" not in response.text
    assert "client_secret" not in response.text
