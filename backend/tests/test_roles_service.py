from collections.abc import Generator
from contextlib import contextmanager

import pytest
from sqlalchemy.orm import Session

from app import main as main_module
from app.core.config import settings
from app.db.models.user import UserModel, UserRole
from app.main import _bootstrap_root_admin
from app.scripts import make_admin
from app.services.roles import ensure_admin_role


def test_ensure_admin_role_promotes_user(db: Session, test_user: UserModel) -> None:
    assert test_user.role == UserRole.USER

    outcome = ensure_admin_role(db, test_user.email)

    assert outcome == "promoted"
    db.refresh(test_user)
    assert test_user.role == UserRole.ADMIN.value


def test_ensure_admin_role_is_idempotent(
    db: Session, admin_user: UserModel
) -> None:
    outcome = ensure_admin_role(db, admin_user.email)

    assert outcome == "already_admin"
    db.refresh(admin_user)
    assert admin_user.role == UserRole.ADMIN.value


def test_ensure_admin_role_matches_email_case_insensitively(
    db: Session, test_user: UserModel
) -> None:
    outcome = ensure_admin_role(db, test_user.email.upper())

    assert outcome == "promoted"
    db.refresh(test_user)
    assert test_user.role == UserRole.ADMIN.value


def test_ensure_admin_role_not_found(db: Session, test_user: UserModel) -> None:
    outcome = ensure_admin_role(db, "nobody@example.com")

    assert outcome == "not_found"
    db.refresh(test_user)
    assert test_user.role == UserRole.USER


def test_ensure_admin_role_blank_email(db: Session) -> None:
    assert ensure_admin_role(db, "   ") == "not_found"


def test_make_admin_cli_promotes(
    db: Session, test_user: UserModel, monkeypatch: pytest.MonkeyPatch
) -> None:
    @contextmanager
    def fake_session() -> Generator[Session, None, None]:
        yield db

    monkeypatch.setattr(make_admin, "SessionLocal", fake_session)

    make_admin.main([test_user.email])

    db.refresh(test_user)
    assert test_user.role == UserRole.ADMIN.value


def test_make_admin_cli_not_found_exits_2(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    @contextmanager
    def fake_session() -> Generator[Session, None, None]:
        yield db

    monkeypatch.setattr(make_admin, "SessionLocal", fake_session)

    with pytest.raises(SystemExit) as exc:
        make_admin.main(["nobody@example.com"])
    assert exc.value.code == 2


def test_bootstrap_root_admin_promotes(
    db: Session, test_user: UserModel, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ROOT_ADMIN_EMAIL", test_user.email)

    @contextmanager
    def fake_session() -> Generator[Session, None, None]:
        yield db

    monkeypatch.setattr(main_module, "SessionLocal", fake_session)

    _bootstrap_root_admin()

    db.refresh(test_user)
    assert test_user.role == UserRole.ADMIN.value


def test_bootstrap_root_admin_unset_is_noop(
    db: Session, test_user: UserModel, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ROOT_ADMIN_EMAIL", "")

    _bootstrap_root_admin()

    db.refresh(test_user)
    assert test_user.role == UserRole.USER


def test_bootstrap_root_admin_unknown_email_logs_warning(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ROOT_ADMIN_EMAIL", "ghost@example.com")

    @contextmanager
    def fake_session() -> Generator[Session, None, None]:
        yield db

    monkeypatch.setattr(main_module, "SessionLocal", fake_session)

    # Should not raise when the account does not exist yet.
    _bootstrap_root_admin()
