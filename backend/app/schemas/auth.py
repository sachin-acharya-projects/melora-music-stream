from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    role: str
    is_active: bool
    oauth_provider: str | None = None
    favorite_genres: list[str] = []
    privacy_settings: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    favorite_genres: list[str] | None = None
    privacy_settings: dict[str, Any] | None = None


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    display_name: str | None = None
