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
    assert "token" not in listed.text
    assert token_data["token"] not in listed.text

    revoked = client.delete(
        f"/api/v1/developer/tokens/{token_data['id']}",
        headers=auth_headers,
    )
    assert revoked.status_code == 204
