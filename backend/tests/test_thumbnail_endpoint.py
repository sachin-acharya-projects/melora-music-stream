import threading
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.services.thumbnail import (
    CACHE_CONTROL,
    ThumbnailService,
    is_allowed_thumbnail_url,
    thumbnail_service,
)

GOOGLE_URL = "https://yt3.googleusercontent.com/abc123=w120-h120-l90-rj"


@pytest.fixture(name="client")
def thumbnail_client(client: TestClient) -> TestClient:
    """Point the thumbnail service at a temp cache dir for each test."""
    return client


def _patch_cache_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(thumbnail_service, "_cache_dir", tmp_path)


def test_allowed_hosts() -> None:
    assert is_allowed_thumbnail_url(GOOGLE_URL) is True
    assert is_allowed_thumbnail_url("http://yt3.googleusercontent.com/x") is False
    assert is_allowed_thumbnail_url("https://example.com/evil") is False
    assert is_allowed_thumbnail_url("not a url") is False
    assert is_allowed_thumbnail_url("") is False


def test_rejects_disallowed_host(client: TestClient) -> None:
    response = client.get("/api/v1/thumbnail", params={"url": "https://example.com/x"})
    assert response.status_code == 400


def test_fetch_on_miss(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_cache_dir(monkeypatch, tmp_path)
    calls: list[str] = []

    def fake_fetch(url: str) -> tuple[str, bytes]:
        calls.append(url)
        return "image/webp", b"\x52\x49\x46\x46fakeimage"

    monkeypatch.setattr(thumbnail_service, "_fetch", fake_fetch)
    response = client.get("/api/v1/thumbnail", params={"url": GOOGLE_URL})
    assert response.status_code == 200
    assert response.headers["cache-control"] == CACHE_CONTROL
    assert response.content == b"\x52\x49\x46\x46fakeimage"
    assert calls == [GOOGLE_URL]


def test_serves_from_cache(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_cache_dir(monkeypatch, tmp_path)
    calls: list[str] = []

    def fake_fetch(url: str) -> tuple[str, bytes]:
        calls.append(url)
        return "image/jpeg", b"\xff\xd8\xff\xe0cached-jpeg"

    monkeypatch.setattr(thumbnail_service, "_fetch", fake_fetch)

    first = client.get("/api/v1/thumbnail", params={"url": GOOGLE_URL})
    assert first.status_code == 200

    second = client.get("/api/v1/thumbnail", params={"url": GOOGLE_URL})
    assert second.status_code == 200
    assert second.content == b"\xff\xd8\xff\xe0cached-jpeg"
    assert calls == [GOOGLE_URL]


def test_single_flight_on_concurrent_requests(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_cache_dir(monkeypatch, tmp_path)
    calls: list[str] = []
    lock = threading.Lock()

    def fake_fetch(url: str) -> tuple[str, bytes]:
        time.sleep(0.05)
        with lock:
            calls.append(url)
        return "image/png", b"\x89PNG\r\nfake"

    monkeypatch.setattr(thumbnail_service, "_fetch", fake_fetch)
    results: list[int] = []

    def hit() -> None:
        response = client.get("/api/v1/thumbnail", params={"url": GOOGLE_URL})
        results.append(response.status_code)

    threads = [threading.Thread(target=hit) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert results == [200] * 8
    assert len(calls) == 1


def test_upstream_failure_returns_502(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_cache_dir(monkeypatch, tmp_path)

    def fake_fetch(url: str) -> tuple[str, bytes]:
        raise RuntimeError("upstream 429")  # noqa: TRY003

    monkeypatch.setattr(thumbnail_service, "_fetch", fake_fetch)
    response = client.get("/api/v1/thumbnail", params={"url": GOOGLE_URL})
    assert response.status_code == 502


def test_negative_result_memoized(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _patch_cache_dir(monkeypatch, tmp_path)
    calls: list[str] = []

    def fake_fetch(url: str) -> tuple[str, bytes]:
        calls.append(url)
        raise RuntimeError("upstream 429")  # noqa: TRY003  # noqa: TRY003

    monkeypatch.setattr(thumbnail_service, "_fetch", fake_fetch)
    for _ in range(3):
        assert (
            client.get("/api/v1/thumbnail", params={"url": GOOGLE_URL}).status_code
            == 502
        )
    assert len(calls) == 1


def test_service_custom_cache_dir(tmp_path: Path) -> None:
    custom = tmp_path / "custom"
    ThumbnailService(cache_dir=custom)
    assert custom.is_dir()
