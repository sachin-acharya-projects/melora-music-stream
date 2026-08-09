from app.core.cache import cache_get_or_set, memory_cache
from app.db.models.user import UserModel
from app.services.youtube import search_cache_key


class TestInvalidateCache:
    def test_unauthenticated(self, client) -> None:
        response = client.post(
            "/api/v1/cache/invalidate", json={"scope": "search", "key": "adele"}
        )
        assert response.status_code == 401

    def test_invalid_scope(self, client, auth_headers: dict) -> None:
        response = client.post(
            "/api/v1/cache/invalidate",
            json={"scope": "bogus", "key": "adele"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_invalidates_search_cache(self, client, auth_headers: dict) -> None:
        cache_get_or_set(search_cache_key("Adele Hello"), 3600, lambda: [{"id": "x"}])
        assert memory_cache.get(search_cache_key("Adele Hello")) is not None

        response = client.post(
            "/api/v1/cache/invalidate",
            json={"scope": "search", "key": "  adele   hello "},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "invalidated"
        assert memory_cache.get(search_cache_key("adele hello")) is None

    def test_per_key_cooldown(self, client, auth_headers: dict) -> None:
        payload = {"scope": "search", "key": "adele"}
        first = client.post(
            "/api/v1/cache/invalidate", json=payload, headers=auth_headers
        )
        assert first.status_code == 200

        second = client.post(
            "/api/v1/cache/invalidate", json=payload, headers=auth_headers
        )
        assert second.status_code == 429

    def test_per_user_budget(
        self, client, test_user: UserModel, auth_headers: dict
    ) -> None:
        # Budget allows 10 invalidations per window; a fresh target each time
        # so the per-key cooldown does not interfere.
        for i in range(10):
            response = client.post(
                "/api/v1/cache/invalidate",
                json={"scope": "search", "key": f"artist-{i}"},
                headers=auth_headers,
            )
            assert response.status_code == 200, response.text

        response = client.post(
            "/api/v1/cache/invalidate",
            json={"scope": "search", "key": "overflow"},
            headers=auth_headers,
        )
        assert response.status_code == 429
