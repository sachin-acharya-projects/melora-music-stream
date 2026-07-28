from datetime import UTC, datetime, timedelta
from typing import Any, NoReturn

import bcrypt
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.user import UserModel, UserRole


class AuthService:
    """Authentication and authorization service."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password for storing."""
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a stored password against one provided by user."""
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

    @staticmethod
    def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)  # type: ignore[no-any-return]

    @staticmethod
    def create_refresh_token(data: dict[str, Any]) -> str:
        """Create a JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.now(UTC) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)  # type: ignore[no-any-return]

    @staticmethod
    def decode_token(token: str) -> dict[str, Any] | None:
        """Decode and validate a JWT token."""
        try:
            return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])  # type: ignore[no-any-return]
        except JWTError:
            return None

    @staticmethod
    def validate_refresh_token(refresh_token_str: str) -> dict[str, Any]:
        """Validate refresh token and return payload. Raises HTTPException on failure."""
        if not refresh_token_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refresh token required")

        payload = AuthService.decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        return payload

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> UserModel:
        """Get a user by ID. Raises HTTPException if not found."""
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        return user

    @staticmethod
    def create_tokens_for_user(user: UserModel) -> dict[str, str]:
        """Create access and refresh tokens for a user."""
        token_data = {"sub": user.id, "email": user.email}
        return {
            "access_token": AuthService.create_access_token(data=token_data),
            "refresh_token": AuthService.create_refresh_token(data=token_data),
        }

    @staticmethod
    def upsert_google_user(
        db: Session,
        *,
        google_id: str,
        email: str,
        name: str | None = None,
        avatar_url: str | None = None,
    ) -> UserModel:
        """Get or create a user from Google OAuth data."""
        user = db.query(UserModel).filter(
            UserModel.oauth_provider == "google",
            UserModel.oauth_id == google_id,
        ).first()

        if user:
            if name and user.display_name != name:
                user.display_name = name
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
            db.commit()
            db.refresh(user)
            return user

        user = db.query(UserModel).filter(UserModel.email == email).first()
        if user:
            user.oauth_provider = "google"
            user.oauth_id = google_id
            if name:
                user.display_name = name
            if avatar_url:
                user.avatar_url = avatar_url
            db.commit()
            db.refresh(user)
            return user

        username = email.split("@", maxsplit=1)[0]
        if name:
            username = name.lower().replace(" ", "_")

        base_username = username
        counter = 1
        while db.query(UserModel).filter(UserModel.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1

        new_user = UserModel(
            email=email,
            username=username,
            display_name=name,
            avatar_url=avatar_url,
            oauth_provider="google",
            oauth_id=google_id,
            role=UserRole.USER,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> UserModel:
        """Authenticate a user by email and password. Raises HTTPException on failure."""
        user = db.query(UserModel).filter(UserModel.email == email).first()
        if not user or not user.password_hash:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not AuthService.verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return user

    @staticmethod
    def get_current_user_from_token(token: str | None, db: Session | None = None) -> UserModel:
        """Validate an access token and return the user. Raises HTTPException on failure.

        When db is provided, fetches the user from DB. Otherwise, returns a minimal
        user-like object from the token payload (used by deps that don't need DB).
        """
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = AuthService.decode_token(token)
        if not payload or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        if db is not None:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive",
                )
            return user

        return AuthService._user_from_payload(payload)

    @staticmethod
    def get_current_user_from_token_optional(token: str | None, db: Session | None = None) -> UserModel | None:
        """Validate an access token and return the user, or None if not authenticated."""
        if not token:
            return None

        payload = AuthService.decode_token(token)
        if not payload or payload.get("type") != "access":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        if db is not None:
            user = db.query(UserModel).filter(UserModel.id == user_id).first()
            if not user or not user.is_active:
                return None
            return user

        return AuthService._user_from_payload(payload)

    @staticmethod
    def require_role(user: UserModel, *roles: UserRole) -> None:
        """Check that user has one of the specified roles. Raises HTTPException if not."""
        if user.role not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

    @staticmethod
    def validate_google_oauth_info(user_info: dict[str, Any]) -> dict[str, str]:
        """Validate and extract fields from Google OAuth userinfo response. Raises HTTPException on failure."""
        if not user_info:
            raise HTTPException(status_code=400, detail="No user info received from Google")

        google_id = user_info.get("sub")
        email = user_info.get("email")

        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Missing required user info from Google")

        return {
            "google_id": google_id,
            "email": email,
            "name": user_info.get("name", ""),
            "avatar_url": user_info.get("picture", ""),
        }

    @staticmethod
    def require_oauth_configured() -> None:
        """Raise HTTPException if Google OAuth is not configured."""
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise HTTPException(
                status_code=500,
                detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
            )

    @staticmethod
    def handle_oauth_error(e: Exception) -> NoReturn:
        """Wrap OAuth provider errors into HTTPException."""
        raise HTTPException(
            status_code=400, detail=f"OAuth authentication failed: {e}"
        ) from e

    @staticmethod
    def _user_from_payload(payload: dict[str, Any]) -> UserModel:
        """Build a minimal UserModel from a decoded JWT payload (no DB query)."""
        return UserModel(
            id=payload["sub"],
            email=payload.get("email", ""),
            username=payload.get("email", "").split("@")[0],
            role=UserRole.USER,
            is_active=True,
        )
