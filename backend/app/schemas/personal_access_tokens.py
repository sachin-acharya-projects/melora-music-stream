from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PersonalAccessTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    scopes: list[str] = Field(min_length=1)
    expires_in_days: int = Field(default=30, ge=1, le=365)


class PersonalAccessTokenResponse(BaseModel):
    id: str
    name: str
    token_prefix: str
    scopes: list[str]
    expires_at: datetime
    last_used_at: datetime | None
    created_at: datetime
    revoked_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PersonalAccessTokenCreated(PersonalAccessTokenResponse):
    token: str
