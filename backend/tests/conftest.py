from collections.abc import Generator
from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.cache import memory_cache, rate_limiter
from app.core.redis import get_redis
from app.db.base import Base, get_db
from app.db.models.user import UserModel, UserRole
from app.main import app
from app.services.artist import _SUGGESTIONS_CACHE, ArtistService
from app.services.auth import AuthService


@pytest.fixture(name="db")
def db_session() -> Generator[Session, None, None]:
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)
    test_session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = test_session_factory()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with DB override and lifespan mocked out."""

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db

    @asynccontextmanager
    async def _noop_lifespan(_application: FastAPI):
        yield

    app.router.lifespan_context = _noop_lifespan  # type: ignore[assignment]

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user(db: Session) -> UserModel:
    """Create a test user."""
    user = UserModel(
        id="test-user-id",
        email="test@example.com",
        username="testuser",
        display_name="Test User",
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="admin_user")
def admin_user(db: Session) -> UserModel:
    """Create an admin user."""
    user = UserModel(
        id="admin-user-id",
        email="admin@example.com",
        username="admin",
        display_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="auth_headers")
def auth_headers(test_user: UserModel) -> dict[str, str]:
    """Create auth headers for the test user."""
    tokens = AuthService.create_tokens_for_user(test_user)
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture(autouse=True)
def clear_artist_suggestions_cache() -> None:
    """Reset the per-user suggestion cache between tests."""
    _SUGGESTIONS_CACHE.clear()


@pytest.fixture(autouse=True)
def clear_cache_layers() -> None:
    """Reset the shared cache tiers and rate limiter between tests.

    The memory tier is process-local, but Redis is shared and persistent (long
    TTLs), so a value cached by one test would otherwise leak into the next
    test and even into the next test run. Flushing it here keeps every test
    deterministic and independent of local Redis state.
    """
    memory_cache.clear()
    rate_limiter.clear()
    get_redis().invalidate_pattern("*")


@pytest.fixture(autouse=True)
def offline_artist_discovery(monkeypatch: pytest.MonkeyPatch) -> None:
    """Disable network discovery so featured suggestions fall back to the
    deterministic genre-based path during tests."""
    monkeypatch.setattr(
        ArtistService,
        "_discover_related_artists",
        lambda db, user_id: [],
    )


@pytest.fixture(name="admin_headers")
def admin_headers(admin_user: UserModel) -> dict[str, str]:
    """Create auth headers for the admin user."""
    tokens = AuthService.create_tokens_for_user(admin_user)
    return {"Authorization": f"Bearer {tokens['access_token']}"}
