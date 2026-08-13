"""Tests for the bug reporter endpoints (/api/v1/bugs and /api/v1/admin/bugs)."""

from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.user import UserModel, UserRole
from app.services.auth import AuthService

PNG_BYTES = b"\x89PNG\r\n\x1a\nfake-png-content-for-size-checks"


@pytest.fixture
def media_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """Route screenshot storage into a temp dir for the duration of a test."""
    media = tmp_path / "media"
    monkeypatch.setattr(settings, "MEDIA_DIR", str(media))
    return media


def _create_report(
    client,
    headers: dict[str, str],
    *,
    title: str = "Playback stutters",
    severity: str = "medium",
    description: str | None = "Plays for a second then pauses.",
    with_screenshot: bool = False,
    screenshot_bytes: bytes = PNG_BYTES,
):
    data = {"title": title, "severity": severity}
    if description is not None:
        data["description"] = description
    files = None
    if with_screenshot:
        files = {"screenshot": ("shot.png", screenshot_bytes, "image/png")}
    return client.post("/api/v1/bugs", data=data, files=files, headers=headers)


def test_create_bug_report_without_screenshot(client, auth_headers):
    response = _create_report(client, auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["title"] == "Playback stutters"
    assert body["severity"] == "medium"
    assert body["status"] == "pending"
    assert body["description"] == "Plays for a second then pauses."
    assert body["screenshot_url"] is None
    assert body["resolved_at"] is None
    assert body["id"]


def test_create_bug_report_with_screenshot(client, auth_headers, media_dir):
    response = _create_report(client, auth_headers, with_screenshot=True)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["screenshot_url"]
    assert body["screenshot_url"].startswith("/media/bug_reports/")
    stored = media_dir / "bug_reports" / body["screenshot_url"].rsplit("/", 1)[-1]
    assert stored.read_bytes() == PNG_BYTES


def test_create_bug_report_requires_auth(client):
    response = _create_report(client, {})
    assert response.status_code in (401, 403)


def test_create_bug_report_validates_title(client, auth_headers):
    response = _create_report(client, auth_headers, title="ab")
    assert response.status_code == 422


def test_create_bug_report_rejects_oversized_screenshot(
    client, auth_headers, media_dir, monkeypatch
):
    monkeypatch.setattr(settings, "BUG_REPORT_SCREENSHOT_MAX_MB", 0)
    response = _create_report(client, auth_headers, with_screenshot=True)
    assert response.status_code == 413


def test_create_bug_report_rejects_wrong_content_type(client, auth_headers):
    data = {"title": "Titles", "severity": "low"}
    files = {"screenshot": ("shot.png", b"data", "text/plain")}
    response = client.post("/api/v1/bugs", data=data, files=files, headers=auth_headers)
    assert response.status_code == 400


def test_list_my_reports_only_returns_own(client, auth_headers):
    _create_report(client, auth_headers, title="My first bug")
    _create_report(client, auth_headers, title="My second bug")

    response = client.get("/api/v1/bugs", headers=auth_headers)
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]
    assert titles == ["My second bug", "My first bug"]


def test_get_own_report(client, auth_headers):
    created = _create_report(client, auth_headers).json()
    response = client.get(f"/api/v1/bugs/{created['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_other_users_report_is_404(client, auth_headers, db: Session):
    created = _create_report(client, auth_headers).json()

    other = UserModel(
        id="other-user-id",
        email="other@example.com",
        username="other",
        role=UserRole.USER,
        is_active=True,
    )
    db.add(other)
    db.commit()

    tokens = AuthService.create_tokens_for_user(other)
    other_headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    response = client.get(f"/api/v1/bugs/{created['id']}", headers=other_headers)
    assert response.status_code == 404


def test_admin_lists_and_filters(client, auth_headers, admin_headers):
    _create_report(client, auth_headers, title="Low priority bug", severity="low")
    _create_report(client, auth_headers, title="Critical bug", severity="critical")

    response = client.get("/api/v1/admin/bugs", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2

    filtered = client.get(
        "/api/v1/admin/bugs", headers=admin_headers, params={"severity": "critical"}
    )
    assert filtered.status_code == 200
    items = filtered.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Critical bug"


def test_admin_update_status_sets_and_clears_resolved_at(client, auth_headers, admin_headers):
    created = _create_report(client, auth_headers).json()

    in_progress = client.patch(
        f"/api/v1/admin/bugs/{created['id']}",
        headers=admin_headers,
        json={"status": "in_progress"},
    )
    assert in_progress.status_code == 200
    assert in_progress.json()["status"] == "in_progress"
    assert in_progress.json()["resolved_at"] is None

    resolved = client.patch(
        f"/api/v1/admin/bugs/{created['id']}",
        headers=admin_headers,
        json={"status": "resolved"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["resolved_at"] is not None


def test_admin_update_status_requires_admin(client, auth_headers):
    created = _create_report(client, auth_headers).json()
    response = client.patch(
        f"/api/v1/admin/bugs/{created['id']}",
        headers=auth_headers,
        json={"status": "in_progress"},
    )
    assert response.status_code in (401, 403)


def test_admin_delete_bug_report(client, auth_headers, admin_headers):
    created = _create_report(client, auth_headers).json()

    response = client.delete(f"/api/v1/admin/bugs/{created['id']}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["deleted"] is True

    gone = client.get("/api/v1/bugs", headers=auth_headers)
    assert gone.json() == []


def test_admin_delete_missing_report_is_404(client, admin_headers):
    response = client.delete(
        "/api/v1/admin/bugs/does-not-exist", headers=admin_headers
    )
    assert response.status_code == 404
