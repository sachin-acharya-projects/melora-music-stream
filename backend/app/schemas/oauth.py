from typing import Literal

from pydantic import BaseModel, Field


class OAuthAuthorizeRequest(BaseModel):
    client_id: str = Field(min_length=16, max_length=80)
    redirect_uri: str = Field(min_length=1, max_length=2048)
    scopes: list[str] = Field(min_length=1)
    state: str = Field(min_length=16, max_length=512)
    code_challenge: str = Field(
        min_length=43,
        max_length=43,
        pattern=r"^[A-Za-z0-9_-]{43}$",
    )
    code_challenge_method: Literal["S256"]


class OAuthTokenRequest(BaseModel):
    grant_type: Literal["authorization_code", "refresh_token", "client_credentials"]
    client_id: str = Field(min_length=16, max_length=80)
    client_secret: str | None = None
    redirect_uri: str | None = Field(default=None, max_length=2048)
    code: str | None = Field(default=None, min_length=32, max_length=256)
    code_verifier: str | None = Field(default=None, min_length=43, max_length=128)
    refresh_token: str | None = Field(default=None, min_length=32, max_length=256)


class OAuthTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int
    refresh_token: str | None = None
    scope: str


class OAuthRevokeRequest(BaseModel):
    client_id: str = Field(min_length=16, max_length=80)
    client_secret: str | None = None
    token: str = Field(min_length=32, max_length=256)
