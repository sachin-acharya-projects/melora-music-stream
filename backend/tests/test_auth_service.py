import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.messages import Messages
from app.db.models.user import UserModel, UserRole
from app.services.auth import AuthService


class TestPasswordHashing:
    def test_hash_and_verify(self) -> None:
        password = "testpassword123"
        hashed = AuthService.hash_password(password)
        assert hashed != password
        assert AuthService.verify_password(password, hashed)

    def test_verify_wrong_password(self) -> None:
        password = "testpassword123"
        hashed = AuthService.hash_password(password)
        assert not AuthService.verify_password("wrongpassword", hashed)


class TestJWT:
    def test_create_and_decode_access_token(self) -> None:
        data = {"sub": "user-123", "email": "test@example.com"}
        token = AuthService.create_access_token(data)
        payload = AuthService.decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self) -> None:
        data = {"sub": "user-123", "email": "test@example.com"}
        token = AuthService.create_refresh_token(data)
        payload = AuthService.decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token(self) -> None:
        payload = AuthService.decode_token("invalid-token")
        assert payload is None


class TestValidateRefreshToken:
    def test_valid_refresh_token(self) -> None:
        data = {"sub": "user-123", "email": "test@example.com"}
        token = AuthService.create_refresh_token(data)
        payload = AuthService.validate_refresh_token(token)
        assert payload["sub"] == "user-123"

    def test_empty_token_raises(self) -> None:
        with pytest.raises(Exception):
            AuthService.validate_refresh_token("")

    def test_access_token_rejected(self) -> None:
        data = {"sub": "user-123", "email": "test@example.com"}
        token = AuthService.create_access_token(data)
        with pytest.raises(Exception):
            AuthService.validate_refresh_token(token)


class TestGetUserById:
    def test_missing_user_raises_generic_message(self, db: Session) -> None:
        with pytest.raises(Exception) as excinfo:
            AuthService.get_user_by_id(db, user_id="missing")
        assert excinfo.value.status_code == 401
        assert excinfo.value.detail == Messages.USER_NOT_FOUND_OR_INACTIVE

    def test_deactivated_user_raises_clear_message(self, db: Session) -> None:
        user = UserModel(
            id="user-inactive",
            email="inactive@example.com",
            username="inactive",
            role=UserRole.USER,
            is_active=False,
        )
        db.add(user)
        db.commit()

        with pytest.raises(Exception) as excinfo:
            AuthService.get_user_by_id(db, user_id="user-inactive")
        assert excinfo.value.status_code == 403
        assert excinfo.value.detail == Messages.ACCOUNT_DEACTIVATED


class TestGetUserFromToken:
    def test_valid_token_returns_user(self) -> None:
        data = {"sub": "user-123", "email": "test@example.com"}
        token = AuthService.create_access_token(data)
        user = AuthService.get_current_user_from_token(token)
        assert user.id == "user-123"
        assert user.email == "test@example.com"

    def test_none_token_raises(self) -> None:
        with pytest.raises(Exception):
            AuthService.get_current_user_from_token(None)

    def test_invalid_token_raises(self) -> None:
        with pytest.raises(Exception):
            AuthService.get_current_user_from_token("invalid-token")

    def test_optional_none_returns_none(self) -> None:
        result = AuthService.get_current_user_from_token_optional(None)
        assert result is None

    def test_optional_valid_token_returns_user(self) -> None:
        data = {"sub": "user-123", "email": "test@example.com"}
        token = AuthService.create_access_token(data)
        user = AuthService.get_current_user_from_token_optional(token)
        assert user is not None
        assert user.id == "user-123"

    def test_db_lookup_deactivated_user_raises_clear_message(
        self, db: Session
    ) -> None:
        user = UserModel(
            id="user-inactive",
            email="inactive@example.com",
            username="inactive",
            role=UserRole.USER,
            is_active=False,
        )
        db.add(user)
        db.commit()

        token = AuthService.create_access_token(
            {"sub": "user-inactive", "email": "inactive@example.com"}
        )
        with pytest.raises(Exception) as excinfo:
            AuthService.get_current_user_from_token(token, db=db)
        assert excinfo.value.status_code == 403
        assert excinfo.value.detail == Messages.ACCOUNT_DEACTIVATED

    def test_db_lookup_missing_user_raises_generic_message(self, db: Session) -> None:
        token = AuthService.create_access_token({"sub": "missing", "email": "x@y.com"})
        with pytest.raises(Exception) as excinfo:
            AuthService.get_current_user_from_token(token, db=db)
        assert excinfo.value.status_code == 401
        assert excinfo.value.detail == Messages.USER_NOT_FOUND_OR_INACTIVE


class TestRequireRole:
    def test_valid_role_passes(self) -> None:
        user = UserModel(role=UserRole.USER, is_active=True)
        AuthService.require_role(user, UserRole.USER, UserRole.ADMIN)

    def test_invalid_role_raises(self) -> None:
        user = UserModel(role=UserRole.USER, is_active=True)
        with pytest.raises(Exception):
            AuthService.require_role(user, UserRole.ADMIN)


class TestCreateTokensForUser:
    def test_creates_both_tokens(self) -> None:
        user = UserModel(
            id="user-123",
            email="test@example.com",
            username="testuser",
            role=UserRole.USER,
            is_active=True,
        )
        tokens = AuthService.create_tokens_for_user(user)
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert len(tokens["access_token"]) > 0
        assert len(tokens["refresh_token"]) > 0


class TestSaveAvatar:
    def _point_media_at(self, monkeypatch, tmp_path) -> None:
        monkeypatch.setattr(
            type(settings), "media_path", property(lambda self: tmp_path)
        )

    def test_saves_under_media(self, tmp_path, monkeypatch) -> None:
        class FakeResponse:
            def raise_for_status(self) -> None:
                return None

            content: bytes = b"fake-image-bytes"

        monkeypatch.setattr(
            "app.services.auth.httpx.get", lambda *args, **kwargs: FakeResponse()
        )
        self._point_media_at(monkeypatch, tmp_path)

        result = AuthService.save_avatar("123", "http://example.com/pic.jpg")

        assert result == "/media/avatars/google_123.jpg"
        saved = tmp_path / "avatars" / "google_123.jpg"
        assert saved.exists()
        assert saved.read_bytes() == b"fake-image-bytes"

    def test_returns_existing_without_download(self, tmp_path, monkeypatch) -> None:
        self._point_media_at(monkeypatch, tmp_path)
        avatar_dir = tmp_path / "avatars"
        avatar_dir.mkdir(parents=True)
        (avatar_dir / "google_123.jpg").write_bytes(b"existing")

        def fail(*args, **kwargs):
            raise AssertionError()

        monkeypatch.setattr("app.services.auth.httpx.get", fail)

        result = AuthService.save_avatar("123", "http://example.com/pic.jpg")

        assert result == "/media/avatars/google_123.jpg"

    def test_returns_none_on_download_failure(self, tmp_path, monkeypatch) -> None:
        def raise_error(*args, **kwargs):
            raise OSError()

        monkeypatch.setattr("app.services.auth.httpx.get", raise_error)
        self._point_media_at(monkeypatch, tmp_path)

        result = AuthService.save_avatar("123", "http://example.com/pic.jpg")

        assert result is None


class TestUpsertGoogleUser:
    def test_creates_new_user(self, db: Session) -> None:
        user = AuthService.upsert_google_user(
            db, google_id="google-123", email="new@example.com", name="New User"
        )
        assert user.email == "new@example.com"
        assert user.oauth_provider == "google"
        assert user.oauth_id == "google-123"

    def test_updates_existing_user(self, db: Session) -> None:
        existing = UserModel(
            email="existing@example.com",
            username="existing",
            oauth_provider="google",
            oauth_id="old-id",
        )
        db.add(existing)
        db.commit()

        user = AuthService.upsert_google_user(
            db, google_id="new-id", email="existing@example.com", name="Updated Name"
        )
        assert user.id == existing.id
        assert user.display_name == "Updated Name"

    def test_deactivated_existing_user_raises_clear_message(self, db: Session) -> None:
        existing = UserModel(
            email="inactive@example.com",
            username="inactive",
            oauth_provider="google",
            oauth_id="old-id",
            is_active=False,
        )
        db.add(existing)
        db.commit()

        with pytest.raises(Exception) as excinfo:
            AuthService.upsert_google_user(
                db,
                google_id="new-id",
                email="inactive@example.com",
                name="Updated Name",
            )
        assert excinfo.value.status_code == 403
        assert excinfo.value.detail == Messages.ACCOUNT_DEACTIVATED
