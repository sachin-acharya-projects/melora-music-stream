def test_scope_catalog_is_public_and_descriptive(client) -> None:
    response = client.get("/api/v1/developer/scopes")

    assert response.status_code == 200
    scopes = response.json()
    names = {scope["name"] for scope in scopes}
    assert "profile:read" in names
    assert "player:control" in names
    assert "admin:users:write" in names
    assert all({"description", "category", "sensitive", "admin_only"} <= scope.keys() for scope in scopes)
