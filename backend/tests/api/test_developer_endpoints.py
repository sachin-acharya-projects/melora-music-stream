import base64
import hashlib
from urllib.parse import parse_qs, urlsplit

from cryptography.fernet import Fernet

from app.core.config import settings
from app.db.models.webhook import WebhookDeliveryModel


def test_scope_catalog_is_public_and_descriptive(client) -> None:
    response = client.get("/api/v1/developer/scopes")

    assert response.status_code == 200
    scopes = response.json()
    names = {scope["name"] for scope in scopes}
    assert "profile:read" in names
    assert "player:control" in names
    assert "admin:users:write" in names
    assert all(
        {"description", "category", "sensitive", "admin_only"} <= scope.keys()
        for scope in scopes
    )


def test_pat_create_list_and_revoke_api(client, auth_headers) -> None:
    created = client.post(
        "/api/v1/developer/tokens",
        headers=auth_headers,
        json={
            "name": "cli automation",
            "scopes": ["profile:read", "library:read"],
            "expires_in_days": 14,
        },
    )
    assert created.status_code == 201
    token_data = created.json()
    assert token_data["token"].startswith("mlpat_")
    assert token_data["scopes"] == ["library:read", "profile:read"]

    listed = client.get("/api/v1/developer/tokens", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert "token_hash" not in listed.text
    assert token_data["token"] not in listed.text

    revoked = client.delete(
        f"/api/v1/developer/tokens/{token_data['id']}",
        headers=auth_headers,
    )
    assert revoked.status_code == 204



def test_oauth_application_registration_and_management(client, auth_headers) -> None:
    created = client.post(
        "/api/v1/developer/applications",
        headers=auth_headers,
        json={
            "name": "CLI Companion",
            "description": "Test integration",
            "redirect_uris": ["https://cli.example.com/oauth/callback"],
            "allowed_scopes": ["profile:read"],
            "is_confidential": True,
        },
    )
    assert created.status_code == 201
    app_data = created.json()
    assert app_data["client_id"]
    assert app_data["client_secret"]
    assert app_data["allowed_scopes"] == ["profile:read"]

    listed = client.get("/api/v1/developer/applications", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["client_secret"] is None
    assert app_data["client_secret"] not in listed.text

    deactivated = client.delete(
        f"/api/v1/developer/applications/{app_data['id']}",
        headers=auth_headers,
    )
    assert deactivated.status_code == 204



def test_oauth_authorize_and_token_endpoints(client, auth_headers) -> None:
    app_response = client.post(
        "/api/v1/developer/applications",
        headers=auth_headers,
        json={
            "name": "API OAuth Client",
            "redirect_uris": ["https://api-client.example.com/callback"],
            "allowed_scopes": ["playlists:read"],
        },
    )
    assert app_response.status_code == 201
    app_data = app_response.json()

    verifier = "v" * 43
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    authorized = client.post(
        "/api/v1/oauth/authorize",
        headers=auth_headers,
        json={
            "client_id": app_data["client_id"],
            "redirect_uri": "https://api-client.example.com/callback",
            "scopes": ["playlists:read"],
            "state": "client-generated-state-value",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert authorized.status_code == 200
    redirect_url = authorized.json()["redirect_url"]
    query = parse_qs(urlsplit(redirect_url).query)

    token_response = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": app_data["client_id"],
            "client_secret": app_data["client_secret"],
            "redirect_uri": "https://api-client.example.com/callback",
            "code": query["code"][0],
            "code_verifier": verifier,
        },
    )
    assert token_response.status_code == 200
    assert token_response.json()["access_token"]
    assert token_response.json()["refresh_token"]
    assert token_response.json()["scope"] == "playlists:read"
    delegated_headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    delegated_read = client.get("/api/v1/playlists/", headers=delegated_headers)
    assert delegated_read.status_code == 200



def test_machine_client_credentials_grant(client, auth_headers) -> None:
    created = client.post(
        "/api/v1/developer/machine-clients",
        headers=auth_headers,
        json={
            "name": "Home Server",
            "service_identity": "urn:melora:home-server",
            "scopes": ["profile:read", "library:read"],
            "expires_in_days": 60,
        },
    )
    assert created.status_code == 201
    machine = created.json()
    assert machine["client_id"].startswith("mlsvc_")
    assert machine["client_secret"].startswith("mlss_")

    token_response = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "client_credentials",
            "client_id": machine["client_id"],
            "client_secret": machine["client_secret"],
        },
    )
    assert token_response.status_code == 200
    assert token_response.json()["access_token"]
    assert token_response.json()["refresh_token"] is None
    assert token_response.json()["scope"] == "library:read profile:read"



def test_webhook_subscription_api(client, db, auth_headers, monkeypatch) -> None:
    monkeypatch.setattr(
        settings,
        "WEBHOOK_SECRET_ENCRYPTION_KEY",
        Fernet.generate_key().decode("ascii"),
    )
    events = client.get("/api/v1/developer/webhook-events")
    assert events.status_code == 200
    assert any(event["name"] == "playlist.created" for event in events.json())

    created = client.post(
        "/api/v1/developer/webhooks",
        headers=auth_headers,
        json={
            "name": "Playlist webhook",
            "endpoint_url": "https://hooks.example.com/melora",
            "events": ["playlist.created"],
        },
    )
    assert created.status_code == 201
    subscription = created.json()
    assert subscription["signing_secret"].startswith("whsec_")

    listed = client.get("/api/v1/developer/webhooks", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert "signing_secret" not in listed.text

    playlist = client.post(
        "/api/v1/playlists/",
        headers=auth_headers,
        json={"name": "Webhook test playlist", "visibility": "private"},
    )
    assert playlist.status_code == 200
    delivery = (
        db.query(WebhookDeliveryModel)
        .filter_by(event_type="playlist.created")
        .one()
    )
    assert delivery.payload["data"]["name"] == "Webhook test playlist"

    rotated = client.post(
        f"/api/v1/developer/webhooks/{subscription['id']}/rotate-secret",
        headers=auth_headers,
    )
    assert rotated.status_code == 200
    assert rotated.json()["signing_secret"] != subscription["signing_secret"]

    deleted = client.delete(
        f"/api/v1/developer/webhooks/{subscription['id']}",
        headers=auth_headers,
    )
    assert deleted.status_code == 204



def test_pat_scope_controls_playlist_read_and_write(client, auth_headers) -> None:
    created = client.post(
        "/api/v1/developer/tokens",
        headers=auth_headers,
        json={"name": "Playlist reader", "scopes": ["playlists:read"]},
    )
    assert created.status_code == 201
    pat_headers = {"Authorization": f"Bearer {created.json()['token']}"}

    readable = client.get("/api/v1/playlists/", headers=pat_headers)
    assert readable.status_code == 200

    browser_created = client.post(
        "/api/v1/playlists/",
        headers=auth_headers,
        json={"name": "Scoped read target", "visibility": "private"},
    )
    assert browser_created.status_code == 200
    individual_read = client.get(
        f"/api/v1/playlists/{browser_created.json()['id']}",
        headers=pat_headers,
    )
    assert individual_read.status_code == 200

    denied = client.post(
        "/api/v1/playlists/",
        headers=pat_headers,
        json={"name": "Should not be created", "visibility": "private"},
    )
    assert denied.status_code == 403


def test_machine_playlist_access_requires_explicit_user_header_and_grant(
    client, auth_headers, test_user
) -> None:
    created = client.post(
        "/api/v1/developer/machine-clients",
        headers=auth_headers,
        json={
            "name": "Playlist sync service",
            "service_identity": "urn:melora:playlist-sync-api",
            "scopes": ["playlists:read"],
        },
    )
    assert created.status_code == 201
    machine = created.json()

    grant = client.post(
        f"/api/v1/developer/machine-clients/{machine['id']}/user-grants",
        headers=auth_headers,
        json={"user_id": test_user.id, "scopes": ["playlists:read"]},
    )
    assert grant.status_code == 201

    token = client.post(
        "/api/v1/oauth/token",
        json={
            "grant_type": "client_credentials",
            "client_id": machine["client_id"],
            "client_secret": machine["client_secret"],
        },
    )
    assert token.status_code == 200
    machine_headers = {"Authorization": f"Bearer {token.json()['access_token']}"}

    missing_target = client.get("/api/v1/playlists/", headers=machine_headers)
    assert missing_target.status_code == 400

    allowed = client.get(
        "/api/v1/playlists/",
        headers={**machine_headers, "X-Melora-User-ID": test_user.id},
    )
    assert allowed.status_code == 200
