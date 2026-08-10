import time

from starlette.requests import Request

from app.api.endpoints.auth import _pending_oauth_url
from app.db.models.user import UserModel
from app.services.auth import AuthService


class TestAuthMe:
    def test_returns_current_user(
        self, client, test_user: UserModel, auth_headers: dict
    ) -> None:
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"

    def test_unauthenticated(self, client) -> None:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestAuthRefresh:
    def test_refresh_token(self, client, test_user: UserModel) -> None:
        tokens = AuthService.create_tokens_for_user(test_user)
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_invalid_refresh_token(self, client) -> None:
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid"},
        )
        assert response.status_code == 401

    def test_missing_refresh_token(self, client) -> None:
        response = client.post("/api/v1/auth/refresh", json={})
        assert response.status_code == 400


class TestAuthLogout:
    def test_logout(self, client) -> None:
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"


class TestAuthLoginRequiresConfig:
    def test_login_redirects(self, client) -> None:
        response = client.get("/api/v1/auth/login", follow_redirects=False)
        # Without Google OAuth configured, should return 500
        assert response.status_code == 500


def _request_with_session(session: dict) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/auth/login",
            "headers": [],
            "query_string": b"",
            "session": session,
        }
    )


class TestPendingOAuthUrl:
    def test_returns_unexpired_pending_url(self) -> None:
        session = {
            "_state_google_abc": {
                "data": {"url": "https://accounts.google.com/o/oauth2/v2/auth?state=abc"},
                "exp": time.time() + 60,
            }
        }
        assert (
            _pending_oauth_url(_request_with_session(session))
            == "https://accounts.google.com/o/oauth2/v2/auth?state=abc"
        )

    def test_ignores_expired_pending_state(self) -> None:
        session = {
            "_state_google_abc": {
                "data": {"url": "https://accounts.google.com/o/oauth2/v2/auth?state=abc"},
                "exp": time.time() - 10,
            }
        }
        assert _pending_oauth_url(_request_with_session(session)) is None

    def test_ignores_unrelated_session_keys(self) -> None:
        session = {"other": "value"}
        assert _pending_oauth_url(_request_with_session(session)) is None
